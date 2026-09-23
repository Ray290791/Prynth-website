import * as THREE from "three";

export interface PrintabilityMetrics {
  totalTriangles: number;
  totalAreaMm2: number;
  contactAreaMm2: number;
  contactPercentage: number;
  overhangAreaMm2: number;
  overhangPercentage: number;
  steepOverhangAreaMm2: number; // > 60 degrees from vertical
  maxOverhangAngleDeg: number;
  aspectRatio: number; // height / min(width, depth)
  centerOfMass: { x: number; y: number; z: number };
  boundingBoxMm: { width: number; depth: number; height: number };
  fitsPrinter: boolean;
}

export interface OrientationCandidate {
  rotation: [number, number, number];
  name: string;
  contactAreaMm2: number;
  overhangAreaMm2: number;
  heightMm: number;
  fitsPrinter: boolean;
  score: number;
  reason: string;
}

export interface SlicerRecommendation {
  id: string;
  category: "orientation" | "supports" | "brim" | "quality" | "infill";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  suggestedValue: any;
  actionLabel: string;
}

export interface PrintabilityReport {
  status: "optimal" | "warning" | "critical";
  score: number; // 0 to 100
  summary: string;
  metrics: PrintabilityMetrics;
  isCurrentOrientationOptimal: boolean;
  optimalOrientation?: OrientationCandidate;
  recommendations: SlicerRecommendation[];
}

interface BuildLimits {
  width: number;
  depth: number;
  height: number;
}

// Helper to evaluate a geometry under a specific rotation
function evaluateOrientation(
  geometry: THREE.BufferGeometry,
  rotation: [number, number, number],
  buildLimits: BuildLimits
): {
  contactArea: number;
  overhangArea: number;
  steepOverhangArea: number;
  totalArea: number;
  maxAngleDeg: number;
  bbox: { width: number; depth: number; height: number };
  aspectRatio: number;
  fits: boolean;
  score: number;
} {
  const posAttr = geometry.attributes.position;
  if (!posAttr) {
    return {
      contactArea: 0,
      overhangArea: 0,
      steepOverhangArea: 0,
      totalArea: 0,
      maxAngleDeg: 0,
      bbox: { width: 0, depth: 0, height: 0 },
      aspectRatio: 1,
      fits: true,
      score: 0,
    };
  }

  const rotEuler = new THREE.Euler(rotation[0], rotation[1], rotation[2]);
  const rotMat = new THREE.Matrix4().makeRotationFromEuler(rotEuler);

  // Compute oriented bounding box
  const tempBox = new THREE.Box3();
  const v = new THREE.Vector3();
  const count = posAttr.count;

  for (let i = 0; i < count; i++) {
    v.fromBufferAttribute(posAttr, i).applyMatrix4(rotMat);
    tempBox.expandByPoint(v);
  }

  const minY = tempBox.min.y;
  const width = Math.max(0.1, tempBox.max.x - tempBox.min.x);
  const depth = Math.max(0.1, tempBox.max.z - tempBox.min.z);
  const height = Math.max(0.1, tempBox.max.y - tempBox.min.y);
  const aspectRatio = height / Math.max(0.1, Math.min(width, depth));

  const fits =
    width <= buildLimits.width &&
    depth <= buildLimits.depth &&
    height <= buildLimits.height;

  // Face traversal
  const index = geometry.index;
  const triCount = index ? index.count / 3 : count / 3;

  let totalArea = 0;
  let contactArea = 0;
  let overhangArea = 0;
  let steepOverhangArea = 0;
  let maxAngleDeg = 0;

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const normal = new THREE.Vector3();

  // Contact threshold: within 0.75mm of lowest Y plane
  const contactYThreshold = minY + 0.75;

  // Sample step for very large meshes (>30,000 triangles) to maintain 60fps responsiveness
  const step = triCount > 40000 ? Math.ceil(triCount / 20000) : 1;

  for (let t = 0; t < triCount; t += step) {
    let i0 = t * 3;
    let i1 = t * 3 + 1;
    let i2 = t * 3 + 2;

    if (index) {
      i0 = index.getX(i0);
      i1 = index.getX(i1);
      i2 = index.getX(i2);
    }

    vA.fromBufferAttribute(posAttr, i0).applyMatrix4(rotMat);
    vB.fromBufferAttribute(posAttr, i1).applyMatrix4(rotMat);
    vC.fromBufferAttribute(posAttr, i2).applyMatrix4(rotMat);

    // Compute triangle normal and area
    cb.subVectors(vC, vB);
    ab.subVectors(vA, vB);
    cb.cross(ab);
    const triArea = (cb.length() * 0.5) * step;
    totalArea += triArea;

    if (triArea > 0.0001) {
      normal.copy(cb).normalize();

      // Normal pointing downwards (ny < 0)
      const ny = normal.y;

      // Bed contact: all 3 vertices close to bed and normal points downward
      const onBed =
        vA.y <= contactYThreshold &&
        vB.y <= contactYThreshold &&
        vC.y <= contactYThreshold;

      if (onBed && ny < -0.7) {
        contactArea += triArea;
      }

      // Overhang analysis: normal points downward
      if (ny < -0.05) {
        // Angle from horizontal plane (90 deg = horizontal flat down, 0 deg = vertical wall)
        // ny = -1 => angleDeg = 90 (completely horizontal downward overhang)
        // ny = -0.7071 => angleDeg = 45 (45 degree overhang)
        const angleDeg = Math.asin(Math.min(1, Math.max(0, -ny))) * (180 / Math.PI);
        if (angleDeg > maxAngleDeg) {
          maxAngleDeg = angleDeg;
        }

        // FDM 3D printing requires support when overhang angle exceeds 45°
        if (angleDeg >= 45) {
          overhangArea += triArea;
        }
        if (angleDeg >= 60) {
          steepOverhangArea += triArea;
        }
      }
    }
  }

  // Calculate orientation score:
  // - High contact area is good (+3x)
  // - Overhang area is bad (-4x)
  // - Lower height is faster to print (-0.15x)
  // - Fitting within build bounds is critical (+/- 10,000)
  const footprintArea = width * depth;
  const contactScore = (contactArea / Math.max(1, footprintArea)) * 100 * 2.5;
  const overhangScore = (overhangArea / Math.max(1, totalArea)) * 100 * 3.5;
  const heightPenalty = (height / 250) * 15;
  const boundsPenalty = fits ? 0 : 10000;

  const score = Math.round(contactScore - overhangScore - heightPenalty - boundsPenalty);

  return {
    contactArea,
    overhangArea,
    steepOverhangArea,
    totalArea,
    maxAngleDeg,
    bbox: { width, depth, height },
    aspectRatio,
    fits,
    score,
  };
}

/**
 * Runs a comprehensive printability check on a model.
 * Evaluates current orientation and benchmarks the 6 primary orthogonal rotations
 * to determine if a more stable, printable orientation exists.
 */
export function analyzePrintability(
  geometry: THREE.BufferGeometry,
  currentRotation: [number, number, number] = [0, 0, 0],
  buildVolume: { x: number; y: number; z: number } = { x: 256, y: 256, z: 256 }
): PrintabilityReport {
  const buildLimits: BuildLimits = {
    width: buildVolume.x,
    depth: buildVolume.y,
    height: buildVolume.z,
  };

  // 1. Evaluate current orientation
  const current = evaluateOrientation(geometry, currentRotation, buildLimits);

  const contactPct = current.totalArea > 0 ? (current.contactArea / current.totalArea) * 100 : 0;
  const overhangPct = current.totalArea > 0 ? (current.overhangArea / current.totalArea) * 100 : 0;

  // Center of mass approximation using bounding box center
  const centerOfMass = {
    x: 0,
    y: current.bbox.height / 2,
    z: 0,
  };

  const metrics: PrintabilityMetrics = {
    totalTriangles: geometry.index
      ? geometry.index.count / 3
      : geometry.attributes.position
      ? geometry.attributes.position.count / 3
      : 0,
    totalAreaMm2: Math.round(current.totalArea),
    contactAreaMm2: Math.round(current.contactArea),
    contactPercentage: Math.round(contactPct * 10) / 10,
    overhangAreaMm2: Math.round(current.overhangArea),
    overhangPercentage: Math.round(overhangPct * 10) / 10,
    steepOverhangAreaMm2: Math.round(current.steepOverhangArea),
    maxOverhangAngleDeg: Math.round(current.maxAngleDeg),
    aspectRatio: Math.round(current.aspectRatio * 10) / 10,
    centerOfMass,
    boundingBoxMm: {
      width: Math.round(current.bbox.width * 10) / 10,
      depth: Math.round(current.bbox.depth * 10) / 10,
      height: Math.round(current.bbox.height * 10) / 10,
    },
    fitsPrinter: current.fits,
  };

  // 2. Search for the optimal orientation among 6 canonical face angles
  const candidateRotations: Array<{ rotation: [number, number, number]; name: string }> = [
    { rotation: [0, 0, 0], name: "Default (As Uploaded)" },
    { rotation: [Math.PI / 2, 0, 0], name: "Lie Flat (Pitch 90°)" },
    { rotation: [Math.PI, 0, 0], name: "Inverted (Pitch 180°)" },
    { rotation: [3 * (Math.PI / 2), 0, 0], name: "Lie Flat (Pitch 270°)" },
    { rotation: [0, 0, Math.PI / 2], name: "On Side (Roll 90°)" },
    { rotation: [0, 0, 3 * (Math.PI / 2)], name: "On Side (Roll 270°)" },
  ];

  let bestCandidate: OrientationCandidate | null = null;
  let bestScore = current.score;

  for (const cand of candidateRotations) {
    const res = evaluateOrientation(geometry, cand.rotation, buildLimits);

    let reason = "Balanced adhesion and minimal overhangs.";
    if (res.contactArea > current.contactArea * 1.3 && res.overhangArea <= current.overhangArea * 1.1) {
      reason = `Increases bed contact area by ${(
        (res.contactArea / Math.max(1, current.contactArea) - 1) *
        100
      ).toFixed(0)}% for much stronger adhesion.`;
    } else if (res.overhangArea < current.overhangArea * 0.7) {
      reason = `Reduces unsupported overhangs by ${(
        (1 - res.overhangArea / Math.max(1, current.overhangArea)) *
        100
      ).toFixed(0)}%, eliminating drooping.`;
    } else if (!current.fits && res.fits) {
      reason = "Rotates model to fit within your printer's build volume limits!";
    }

    const candidateObj: OrientationCandidate = {
      rotation: cand.rotation,
      name: cand.name,
      contactAreaMm2: Math.round(res.contactArea),
      overhangAreaMm2: Math.round(res.overhangArea),
      heightMm: Math.round(res.bbox.height),
      fitsPrinter: res.fits,
      score: res.score,
      reason,
    };

    // Does this orientation beat current by at least 15%?
    if (res.score > bestScore + 15 || (!current.fits && res.fits)) {
      bestScore = res.score;
      bestCandidate = candidateObj;
    }
  }

  // 3. Generate Slicer Recommendations
  const recommendations: SlicerRecommendation[] = [];

  // (A) Orientation recommendation
  const isCurrentOrientationOptimal = !bestCandidate;
  if (bestCandidate) {
    recommendations.push({
      id: "rec-orientation",
      category: "orientation",
      title: `Auto-Orient: ${bestCandidate.name}`,
      description: bestCandidate.reason,
      impact: !current.fits ? "high" : "medium",
      suggestedValue: bestCandidate.rotation,
      actionLabel: "Apply Optimal Orientation",
    });
  }

  // (B) Support structure recommendation
  if (overhangPct >= 3.0 || current.steepOverhangArea > 40) {
    const isOrganicOrHighPoly = metrics.totalTriangles > 8000 || overhangPct > 8.0;
    const recommendedType = isOrganicOrHighPoly ? "tree" : "normal";
    recommendations.push({
      id: "rec-supports",
      category: "supports",
      title: isOrganicOrHighPoly
        ? "Enable Tree (Organic) Supports"
        : "Enable Standard Supports",
      description: `Model has ${overhangPct.toFixed(1)}% overhang area with angles reaching ${metrics.maxOverhangAngleDeg}°. Supports prevent drooping and printing into mid-air.`,
      impact: "high",
      suggestedValue: recommendedType,
      actionLabel: isOrganicOrHighPoly ? "Enable Tree Supports" : "Enable Standard Supports",
    });
  }

  // (C) Bed adhesion / Brim recommendation
  if (current.aspectRatio > 2.2 || contactPct < 2.0 || current.contactArea < 50) {
    recommendations.push({
      id: "rec-brim",
      category: "brim",
      title: "Add Outer Brim (5mm)",
      description: `Tall aspect ratio (${current.aspectRatio.toFixed(1)}:1) and small bed contact footprint increase the risk of the model detaching from the PEI plate mid-print.`,
      impact: current.aspectRatio > 3.0 ? "high" : "medium",
      suggestedValue: "outer",
      actionLabel: "Enable Outer Brim",
    });
  }

  // (D) Detail vs Speed / Layer Height
  if (current.bbox.height < 45 && metrics.totalTriangles > 15000) {
    recommendations.push({
      id: "rec-quality",
      category: "quality",
      title: "Use 0.12mm High Detail Profile",
      description: "Small model with intricate curvature benefits from Bambu 0.12mm fine layer profile for smooth curves without stepping.",
      impact: "low",
      suggestedValue: "fine",
      actionLabel: "Switch to 0.12mm Fine",
    });
  } else if (current.bbox.height > 180 || metrics.totalAreaMm2 > 90000) {
    recommendations.push({
      id: "rec-quality-draft",
      category: "quality",
      title: "Use 0.24mm High-Speed Draft Profile",
      description: "Large volume part prints ~35% faster with 0.24mm layer height while maintaining structural rigidity.",
      impact: "low",
      suggestedValue: "draft",
      actionLabel: "Switch to 0.24mm Draft",
    });
  }

  // (E) Infill tuning
  if (current.aspectRatio > 2.0 && current.contactArea < 100) {
    recommendations.push({
      id: "rec-infill",
      category: "infill",
      title: "Set 25% Gyroid Infill with 3 Wall Loops",
      description: "Gyroid infill provides uniform 3D tensile strength across X, Y, and Z axes without nozzle scraping.",
      impact: "medium",
      suggestedValue: { infillPct: 25, infillPattern: "gyroid", wallLoops: 3 },
      actionLabel: "Apply Strength Tuning",
    });
  }

  // Determine overall status
  let status: "optimal" | "warning" | "critical" = "optimal";
  let summary = "Print-ready! Excellent bed contact and printable geometry.";
  let score = 95;

  if (!current.fits) {
    status = "critical";
    summary = "Model exceeds the printer's build volume in its current orientation.";
    score = 30;
  } else if (overhangPct >= 5.0 && current.aspectRatio > 2.5) {
    status = "warning";
    summary = "Supports and bed adhesion brim strongly recommended to ensure 100% print success.";
    score = 65;
  } else if (overhangPct >= 3.0) {
    status = "warning";
    summary = "Overhangs detected above 45°. Enabling supports will prevent drooping.";
    score = 75;
  } else if (!isCurrentOrientationOptimal && bestCandidate) {
    status = "warning";
    summary = `Alternative orientation (${bestCandidate.name}) provides significantly better bed adhesion.`;
    score = 80;
  }

  return {
    status,
    score,
    summary,
    metrics,
    isCurrentOrientationOptimal,
    optimalOrientation: bestCandidate ?? undefined,
    recommendations,
  };
}
