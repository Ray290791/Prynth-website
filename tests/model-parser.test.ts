import { describe, it, expect } from "vitest";
import * as THREE from "three";
import fs from "node:fs";
import { zipSync, strToU8 } from "fflate";
import {
  computeGeometryVolume,
  estimateFdmMaterialVolumeCm3,
  parse3MFTransform,
  parse3MF,
} from "../src/lib/model-parser";

describe("3D Model Parser & Geometry Calculations", () => {
  it("accurately computes the volume of a 3D geometry cube", () => {
    // 10mm x 10mm x 10mm cube = 1000 mm³
    const geometry = new THREE.BoxGeometry(10, 10, 10);
    const volumeMm3 = computeGeometryVolume(geometry);

    expect(volumeMm3).toBeCloseTo(1000, 0);
  });

  it("accurately computes the volume of a larger rectangular box", () => {
    // 20mm x 30mm x 40mm box = 24000 mm³
    const geometry = new THREE.BoxGeometry(20, 30, 40);
    const volumeMm3 = computeGeometryVolume(geometry);

    expect(volumeMm3).toBeCloseTo(24000, 0);
  });

  it("estimates FDM slicer filament usage based on infill and shells", () => {
    const solidVolumeMm3 = 50000; // 50 cm³
    const surfaceAreaMm2 = 12000;

    const volume20 = estimateFdmMaterialVolumeCm3(solidVolumeMm3, surfaceAreaMm2, 20, 2);
    const volume50 = estimateFdmMaterialVolumeCm3(solidVolumeMm3, surfaceAreaMm2, 50, 2);
    const volume100 = estimateFdmMaterialVolumeCm3(solidVolumeMm3, surfaceAreaMm2, 100, 2);

    expect(volume20).toBeGreaterThan(0);
    expect(volume50).toBeGreaterThan(volume20);
    expect(volume100).toBeGreaterThan(volume50);
    expect(volume100).toBeCloseTo(solidVolumeMm3 / 1000, 0);
  });

  it("accurately parses 3MF affine 12-number transform into Three.js Matrix4", () => {
    // Identity transform
    const identityMat = parse3MFTransform("1 0 0 0 1 0 0 0 1 0 0 0");
    const v0 = new THREE.Vector3(5, 10, 15).applyMatrix4(identityMat);
    expect(v0.x).toBeCloseTo(5);
    expect(v0.y).toBeCloseTo(10);
    expect(v0.z).toBeCloseTo(15);

    // Translation only: tx=100, ty=200, tz=300
    const transMat = parse3MFTransform("1 0 0 0 1 0 0 0 1 100 200 300");
    const v1 = new THREE.Vector3(0, 0, 0).applyMatrix4(transMat);
    expect(v1.x).toBeCloseTo(100);
    expect(v1.y).toBeCloseTo(200);
    expect(v1.z).toBeCloseTo(300);

    // Bambu Studio Item 4 transform (180 deg around X, translation):
    // "1 0 0 0 -1 0 0 0 -1 139.25 128 9.275"
    const flipMat = parse3MFTransform("1 0 0 0 -1 0 0 0 -1 139.25 128 9.275");
    const v2 = new THREE.Vector3(0, 5, 2).applyMatrix4(flipMat);
    // x' = x + 139.25 = 139.25
    // y' = -y + 128 = 123
    // z' = -z + 9.275 = 7.275
    expect(v2.x).toBeCloseTo(139.25);
    expect(v2.y).toBeCloseTo(123);
    expect(v2.z).toBeCloseTo(7.275);
  });

  it("correctly parses multi-part 3MF and preserves separate part placements on build plate", async () => {
    // Programmatically construct a 3MF package containing 2 distinct parts placed side-by-side
    // Part 1: Cube at X=0..10, Y=0..10, Z=0..10 (placed at plate offset X=20)
    // Part 2: Cube at X=0..10, Y=0..10, Z=0..10 (placed at plate offset X=50)
    // Total span should be from X=20 to X=60 => Width = 40mm (NOT 10mm!)
    const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources>
    <object id="1" type="model">
      <mesh>
        <vertices>
          <vertex x="0" y="0" z="0"/>
          <vertex x="10" y="0" z="0"/>
          <vertex x="10" y="10" z="0"/>
          <vertex x="0" y="10" z="0"/>
          <vertex x="0" y="0" z="10"/>
          <vertex x="10" y="0" z="10"/>
          <vertex x="10" y="10" z="10"/>
          <vertex x="0" y="10" z="10"/>
        </vertices>
        <triangles>
          <triangle v1="0" v2="1" v3="2"/>
          <triangle v1="0" v2="2" v3="3"/>
          <triangle v1="4" v2="6" v3="5"/>
          <triangle v1="4" v2="7" v3="6"/>
          <triangle v1="0" v2="4" v3="5"/>
          <triangle v1="0" v2="5" v3="1"/>
          <triangle v1="2" v2="6" v3="7"/>
          <triangle v1="2" v2="7" v3="3"/>
          <triangle v1="0" v2="3" v3="7"/>
          <triangle v1="0" v2="7" v3="4"/>
          <triangle v1="1" v2="5" v3="6"/>
          <triangle v1="1" v2="6" v3="2"/>
        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="1" transform="1 0 0 0 1 0 0 0 1 20 0 0"/>
    <item objectid="1" transform="1 0 0 0 1 0 0 0 1 50 0 0"/>
  </build>
</model>`;

    const zipData = zipSync({
      "3D/3dmodel.model": strToU8(modelXml),
    });

    const result = await parse3MF(zipData.buffer as ArrayBuffer);
    expect(result).not.toBeNull();
    // Two 10mm cubes separated by 20mm gap: X goes from 20 to 60 -> width 40mm
    expect(result?.sizeMm.x).toBeCloseTo(40, 0);
    expect(result?.sizeMm.y).toBeCloseTo(10, 0);
    expect(result?.sizeMm.z).toBeCloseTo(10, 0);
    expect(result?.triangles).toBe(24); // 12 triangles * 2 items
  });

  it("accurately parses Bambu Studio project 3MF with production cross-file components", async () => {
    const testFilePath = "C:/Users/raybe/Downloads/PegSnapTest2.3mf";
    if (fs.existsSync(testFilePath)) {
      const buffer = fs.readFileSync(testFilePath);
      const result = await parse3MF(buffer.buffer as ArrayBuffer);

      expect(result).not.toBeNull();
      // Bambu Studio build plate assembly width: 42.6mm (separated side-by-side)
      expect(result?.sizeMm.x).toBeCloseTo(42.6, 1);
      expect(result?.sizeMm.y).toBeCloseTo(15.0, 1);
      expect(result?.sizeMm.z).toBeCloseTo(20.0, 1);
      expect(result?.triangles).toBe(12196);
    }
  });
});
