import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { computeGeometryVolume, estimateFdmMaterialVolumeCm3 } from "../src/lib/model-parser";

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
});
