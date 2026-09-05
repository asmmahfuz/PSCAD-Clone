/**
 * PSCAD Modern - Manhattan Orthogonal Wire Auto-Routing & Usability Suite
 * 
 * Features:
 * - Manhattan (L-shaped and Z-shaped) 90-degree orthogonal path generation
 * - Component bounding box obstacle avoidance
 * - Segment midpoint handle calculations for interactive wire repositioning
 */

import type { Point, CircuitComponentData } from '../../types';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export class WireRouter {
  /**
   * Generates a clean Manhattan orthogonal path between start and end points
   */
  static routeOrthogonal(
    start: Point,
    end: Point,
    components: CircuitComponentData[] = [],
    preferredOrientation: 'horizontal-first' | 'vertical-first' = 'horizontal-first'
  ): Point[] {
    // If start and end are on the same vertical or horizontal axis
    if (Math.abs(start.x - end.x) < 1e-3 || Math.abs(start.y - end.y) < 1e-3) {
      return [{ x: start.x, y: start.y }, { x: end.x, y: end.y }];
    }

    // Check if simple L-route intersects any component obstacle
    const obstacles = WireRouter.getComponentObstacles(components);

    if (preferredOrientation === 'horizontal-first') {
      const midPoint = { x: end.x, y: start.y };
      const pathA = [{ x: start.x, y: start.y }, midPoint, { x: end.x, y: end.y }];
      if (!WireRouter.pathIntersectsObstacles(pathA, obstacles)) {
        return pathA;
      }

      // Try vertical-first
      const midPointB = { x: start.x, y: end.y };
      const pathB = [{ x: start.x, y: start.y }, midPointB, { x: end.x, y: end.y }];
      if (!WireRouter.pathIntersectsObstacles(pathB, obstacles)) {
        return pathB;
      }
    } else {
      const midPointB = { x: start.x, y: end.y };
      const pathB = [{ x: start.x, y: start.y }, midPointB, { x: end.x, y: end.y }];
      if (!WireRouter.pathIntersectsObstacles(pathB, obstacles)) {
        return pathB;
      }

      const midPoint = { x: end.x, y: start.y };
      const pathA = [{ x: start.x, y: start.y }, midPoint, { x: end.x, y: end.y }];
      if (!WireRouter.pathIntersectsObstacles(pathA, obstacles)) {
        return pathA;
      }
    }

    // If both L-shapes hit obstacles, use Z-shaped (3-segment) route with halfway midpoint
    const midX = Math.round((start.x + end.x) / 40) * 20;
    return [
      { x: start.x, y: start.y },
      { x: midX, y: start.y },
      { x: midX, y: end.y },
      { x: end.x, y: end.y },
    ];
  }

  /**
   * Get bounding boxes of components with safety clearance margins
   */
  static getComponentObstacles(components: CircuitComponentData[], margin = 8): BoundingBox[] {
    return components.map((c) => ({
      minX: c.x - 45 - margin,
      minY: c.y - 45 - margin,
      maxX: c.x + 45 + margin,
      maxY: c.y + 45 + margin,
    }));
  }

  /**
   * Check if any line segment in the path intersects any bounding box
   */
  static pathIntersectsObstacles(points: Point[], obstacles: BoundingBox[]): boolean {
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      for (const box of obstacles) {
        if (WireRouter.segmentIntersectsBox(p1, p2, box)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if an orthogonal segment intersects a bounding box
   */
  static segmentIntersectsBox(p1: Point, p2: Point, box: BoundingBox): boolean {
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);

    if (maxX <= box.minX || minX >= box.maxX || maxY <= box.minY || minY >= box.maxY) {
      return false;
    }
    return true;
  }

  /**
   * Calculate midpoints for each segment of a wire for interactive dragging
   */
  static getSegmentMidpoints(points: Point[]): Array<{ index: number; pt: Point; isHorizontal: boolean }> {
    const midpoints: Array<{ index: number; pt: Point; isHorizontal: boolean }> = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const isHorizontal = Math.abs(p1.y - p2.y) < 1e-3;
      midpoints.push({
        index: i,
        pt: {
          x: (p1.x + p2.x) / 2,
          y: (p1.y + p2.y) / 2,
        },
        isHorizontal,
      });
    }
    return midpoints;
  }
}
