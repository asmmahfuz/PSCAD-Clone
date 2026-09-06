/**
 * PSCAD CLONE - High-Fidelity Wire & Conductor Rendering Engine
 * Phase 23 - Step 23.3: Visual Distinctions for Polyphase vs. Control Signal Wires
 * 
 * Commercial-Grade Standards:
 * - 1-Phase Electrical Wire: Standard 2.0px solid dark line (or phase color) with circular junction dots.
 * - 3-Phase Polyphase Wire: Heavy 3.5px solid blue line with authentic 3-slash bundle glyphs (///).
 * - Control Signal Wire: 1.5px green dashed line with directional flow arrowheads & square junction markers.
 */

import type { Point, WireData, Pin, PinDomain, CircuitComponentData } from '../../types';
import type { ThemePalette } from '../../constants/themes';
import { WireRouter } from './wireRouter';

export interface WireStyleConfig {
  domain: PinDomain;
  strokeColor: string;
  lineWidth: number;
  lineDash: number[];
  junctionShape: 'circle' | 'square';
  junctionRadius: number;
  hasBundleIndicator: boolean;
  hasSignalArrowheads: boolean;
  signalDirection: 'forward' | 'reverse' | 'bidirectional';
}

export class WireRenderer {
  /**
   * Resolves the wire domain (polyphase, control, or electrical)
   * Prioritizes explicit wire.domain, then auto-infers from connected pin metadata.
   */
  static resolveWireDomain(wire: WireData, pinMap?: Map<string, Pin>): PinDomain {
    if (wire.domain) {
      return wire.domain;
    }

    if (!pinMap) {
      return 'electrical';
    }

    const startP = wire.startPin ? pinMap.get(wire.startPin) : undefined;
    const endP = wire.endPin ? pinMap.get(wire.endPin) : undefined;

    // Polyphase priority
    if (startP?.domain === 'polyphase' || endP?.domain === 'polyphase') {
      return 'polyphase';
    }

    // Control signal priority
    if (startP?.domain === 'control' || endP?.domain === 'control') {
      return 'control';
    }

    return 'electrical';
  }

  /**
   * Inters signal data flow direction for control wires:
   * - 'forward': from startPin to endPin (start is 'out', end is 'in')
   * - 'reverse': from endPin to startPin (end is 'out', start is 'in')
   * - 'bidirectional': unknown or peer-to-peer
   */
  static resolveSignalDirection(wire: WireData, pinMap?: Map<string, Pin>): 'forward' | 'reverse' | 'bidirectional' {
    if (!pinMap || !wire.startPin || !wire.endPin) {
      return 'forward';
    }

    const startP = pinMap.get(wire.startPin);
    const endP = pinMap.get(wire.endPin);

    if (startP?.direction === 'out' && endP?.direction === 'in') {
      return 'forward';
    }
    if (startP?.direction === 'in' && endP?.direction === 'out') {
      return 'reverse';
    }

    // Default to forward if start is an output or end is an input
    if (startP?.direction === 'out' || endP?.direction === 'in') {
      return 'forward';
    }
    if (startP?.direction === 'in' || endP?.direction === 'out') {
      return 'reverse';
    }

    return 'forward';
  }

  /**
   * Computes the complete visual style for a wire based on theme, selection, and domain
   */
  static getWireStyle(
    wire: WireData,
    domain: PinDomain,
    isSelected: boolean,
    colors: ThemePalette,
    pinMap?: Map<string, Pin>
  ): WireStyleConfig {
    const isLight = !colors.isDark;
    const signalDirection = WireRenderer.resolveSignalDirection(wire, pinMap);

    if (domain === 'polyphase') {
      const strokeColor = isSelected
        ? isLight ? '#1d4ed8' : '#60a5fa'
        : colors.wirePolyphase || (isLight ? '#1d4ed8' : '#38bdf8');

      return {
        domain: 'polyphase',
        strokeColor,
        lineWidth: isSelected ? 5.0 : 3.5,
        lineDash: [],
        junctionShape: 'circle',
        junctionRadius: isSelected ? 4.5 : 3.8,
        hasBundleIndicator: true,
        hasSignalArrowheads: false,
        signalDirection: 'bidirectional',
      };
    }

    if (domain === 'control') {
      const strokeColor = isSelected
        ? '#10b981'
        : colors.wireControl || (isLight ? '#059669' : '#10b981');

      return {
        domain: 'control',
        strokeColor,
        lineWidth: isSelected ? 2.5 : 1.5,
        lineDash: [5, 4],
        junctionShape: 'square',
        junctionRadius: 2.5,
        hasBundleIndicator: false,
        hasSignalArrowheads: true,
        signalDirection,
      };
    }

    // Standard 1-Phase Electrical
    let strokeColor = isSelected
      ? isLight ? '#2563eb' : '#58a6ff'
      : colors.wireNormal || (isLight ? '#1e293b' : '#4fc1ff');

    if (!isSelected && wire.phase && wire.phase !== 'normal') {
      switch (wire.phase) {
        case 'phaseA':
          strokeColor = '#ef4444'; // Red
          break;
        case 'phaseB':
          strokeColor = '#eab308'; // Yellow / Amber
          break;
        case 'phaseC':
          strokeColor = '#3b82f6'; // Blue
          break;
        case 'neutral':
          strokeColor = isLight ? '#475569' : '#94a3b8'; // Neutral Slate
          break;
      }
    }

    return {
      domain: 'electrical',
      strokeColor,
      lineWidth: isSelected ? 3.5 : 2.0,
      lineDash: [],
      junctionShape: 'circle',
      junctionRadius: isSelected ? 3.0 : 2.5,
      hasBundleIndicator: false,
      hasSignalArrowheads: false,
      signalDirection: 'bidirectional',
    };
  }

  /**
   * Renders authentic 3-phase hash bundle glyphs (///) angled across a wire segment
   * Standard single-line diagram symbol for 3-conductor polyphase cables.
   */
  static drawSlashBundleIndicator(
    ctx: CanvasRenderingContext2D,
    p1: Point,
    p2: Point,
    color: string,
    count = 3
  ): void {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len < 26) return; // Do not draw on very short segments

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.setLineDash([]); // Always solid

    // Midpoint of segment
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;

    // Unit vector along segment
    const ux = dx / len;
    const uy = dy / len;

    // Normal vector perpendicular to segment
    const nx = -uy;
    const ny = ux;

    // Slash angle: 60 degrees relative to conductor
    // s = cos(60)*u + sin(60)*n = 0.50*u + 0.866*n
    const sx = 0.50 * ux + 0.866 * nx;
    const sy = 0.50 * uy + 0.866 * ny;

    const halfSlash = 6.5;
    const slashSpacing = 4.0;
    const startOffset = -((count - 1) * slashSpacing) / 2;

    for (let i = 0; i < count; i++) {
      const offset = startOffset + i * slashSpacing;
      const cx = mx + offset * ux;
      const cy = my + offset * uy;

      ctx.beginPath();
      ctx.moveTo(cx - halfSlash * sx, cy - halfSlash * sy);
      ctx.lineTo(cx + halfSlash * sx, cy + halfSlash * sy);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Renders a crisp directional signal flow arrowhead along a segment pointing towards 'to'
   */
  static drawSignalArrowhead(
    ctx: CanvasRenderingContext2D,
    from: Point,
    to: Point,
    color: string,
    arrowSize = 7.5,
    offsetFromTo = 0
  ): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len < 10) return;

    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;

    // Arrow tip location
    const tipX = to.x - offsetFromTo * ux;
    const tipY = to.y - offsetFromTo * uy;

    // Arrow base points
    const baseLen = arrowSize;
    const halfWidth = arrowSize * 0.50;

    const bX = tipX - baseLen * ux;
    const bY = tipY - baseLen * uy;

    const leftX = bX + halfWidth * nx;
    const leftY = bY + halfWidth * ny;
    const rightX = bX - halfWidth * nx;
    const rightY = bY - halfWidth * ny;

    ctx.save();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.lineJoin = 'miter';

    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(leftX, leftY);
    ctx.lineTo(rightX, rightY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Renders junction dots or square markers at path vertices
   */
  static drawJunctionDots(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    style: WireStyleConfig
  ): void {
    if (points.length === 0) return;

    ctx.save();
    ctx.setLineDash([]);
    ctx.fillStyle = style.strokeColor;
    ctx.strokeStyle = style.strokeColor;

    for (const p of points) {
      ctx.beginPath();
      if (style.junctionShape === 'square') {
        const r = style.junctionRadius;
        ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
      } else {
        ctx.arc(p.x, p.y, style.junctionRadius, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * Main wire rendering function for a single schematic wire
   */
  static renderWire(
    ctx: CanvasRenderingContext2D,
    wire: WireData,
    pinMap: Map<string, Pin>,
    colors: ThemePalette,
    isSelected: boolean
  ): void {
    const domain = WireRenderer.resolveWireDomain(wire, pinMap);
    const style = WireRenderer.getWireStyle(wire, domain, isSelected, colors, pinMap);

    const startP = wire.startPin ? pinMap.get(wire.startPin) : null;
    const endP = wire.endPin ? pinMap.get(wire.endPin) : null;

    const rawPts = wire.points || [];
    if (rawPts.length === 0) return;

    // Anchor start and end points to live pin coordinates
    const pts = rawPts.map((p, idx) => {
      if (idx === 0 && startP) return { x: startP.x, y: startP.y };
      if (idx === rawPts.length - 1 && endP) return { x: endP.x, y: endP.y };
      return p;
    });

    if (pts.length < 2) return;

    ctx.save();

    // 1. Draw Selection Glow / Halo for high visibility
    if (isSelected) {
      ctx.save();
      ctx.strokeStyle = domain === 'polyphase'
        ? (colors.isDark ? 'rgba(96, 165, 250, 0.40)' : 'rgba(29, 78, 216, 0.35)')
        : domain === 'control'
          ? 'rgba(16, 185, 129, 0.40)'
          : (colors.isDark ? 'rgba(88, 166, 255, 0.40)' : 'rgba(37, 99, 235, 0.35)');
      ctx.lineWidth = style.lineWidth + 5.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([]);
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
        else ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 2. Draw Main Wire Conductor Path
    ctx.strokeStyle = style.strokeColor;
    ctx.lineWidth = style.lineWidth;
    ctx.lineCap = domain === 'control' ? 'butt' : 'round';
    ctx.lineJoin = 'miter';
    ctx.setLineDash(style.lineDash);

    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
      else ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();

    // 3. Draw 3-Phase Polyphase Slash Bundle Indicators
    if (style.hasBundleIndicator) {
      // Find the longest segment or all segments with length >= 32px
      let maxLen = 0;
      let longestSegIdx = -1;
      for (let i = 0; i < pts.length - 1; i++) {
        const segLen = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
        if (segLen > maxLen) {
          maxLen = segLen;
          longestSegIdx = i;
        }
      }

      if (longestSegIdx >= 0 && maxLen >= 26) {
        WireRenderer.drawSlashBundleIndicator(
          ctx,
          pts[longestSegIdx],
          pts[longestSegIdx + 1],
          style.strokeColor,
          3
        );
      }
    }

    // 4. Draw Control Signal Directional Flow Arrowheads
    if (style.hasSignalArrowheads) {
      const isForward = style.signalDirection !== 'reverse';

      // 4a. Arrowhead entering destination pin
      if (isForward && pts.length >= 2) {
        const lastIdx = pts.length - 1;
        WireRenderer.drawSignalArrowhead(
          ctx,
          pts[lastIdx - 1],
          pts[lastIdx],
          style.strokeColor,
          8.0,
          endP ? 4.0 : 0
        );
      } else if (!isForward && pts.length >= 2) {
        WireRenderer.drawSignalArrowhead(
          ctx,
          pts[1],
          pts[0],
          style.strokeColor,
          8.0,
          startP ? 4.0 : 0
        );
      }

      // 4b. Midpoint arrow on long segments (>= 48px)
      for (let i = 0; i < pts.length - 1; i++) {
        const pA = isForward ? pts[i] : pts[i + 1];
        const pB = isForward ? pts[i + 1] : pts[i];
        const segLen = Math.hypot(pB.x - pA.x, pB.y - pA.y);
        if (segLen >= 48) {
          const midPt = { x: (pA.x + pB.x) / 2, y: (pA.y + pB.y) / 2 };
          WireRenderer.drawSignalArrowhead(
            ctx,
            pA,
            midPt,
            style.strokeColor,
            7.0,
            0
          );
        }
      }
    }

    // 5. Draw Junction Markers at Vertices
    WireRenderer.drawJunctionDots(ctx, pts, style);

    ctx.restore();
  }

  /**
   * Renders the interactive wire preview during user drawing
   */
  static renderActiveWirePreview(
    ctx: CanvasRenderingContext2D,
    activeWire: { startPin?: string | null; domain?: PinDomain; points: Point[] },
    pinMap: Map<string, Pin>,
    colors: ThemePalette,
    components: CircuitComponentData[]
  ): void {
    if (!activeWire || !activeWire.points || activeWire.points.length < 2) return;

    const startP = activeWire.startPin ? pinMap.get(activeWire.startPin) : null;
    const domain: PinDomain = activeWire.domain || startP?.domain || 'electrical';

    const p1 = activeWire.points[0];
    const p2 = activeWire.points[1];
    const routed = WireRouter.routeOrthogonal(p1, p2, components);

    ctx.save();

    if (domain === 'polyphase') {
      ctx.strokeStyle = colors.wirePolyphase || (!colors.isDark ? '#1d4ed8' : '#38bdf8');
      ctx.lineWidth = 3.5;
      ctx.setLineDash([6, 4]);
    } else if (domain === 'control') {
      ctx.strokeStyle = colors.wireControl || (!colors.isDark ? '#059669' : '#10b981');
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
    } else {
      ctx.strokeStyle = colors.pinHover || '#ea580c';
      ctx.lineWidth = 2.0;
      ctx.setLineDash([4, 4]);
    }

    ctx.beginPath();
    for (let i = 0; i < routed.length; i++) {
      if (i === 0) ctx.moveTo(routed[i].x, routed[i].y);
      else ctx.lineTo(routed[i].x, routed[i].y);
    }
    ctx.stroke();

    // Directional preview arrowhead for control signal
    if (domain === 'control' && routed.length >= 2) {
      const last = routed[routed.length - 1];
      const prev = routed[routed.length - 2];
      WireRenderer.drawSignalArrowhead(ctx, prev, last, ctx.strokeStyle, 7.5, 2.0);
    }

    // Slash preview for polyphase
    if (domain === 'polyphase' && routed.length >= 2) {
      let maxLen = 0;
      let longestIdx = -1;
      for (let i = 0; i < routed.length - 1; i++) {
        const segLen = Math.hypot(routed[i + 1].x - routed[i].x, routed[i + 1].y - routed[i].y);
        if (segLen > maxLen) {
          maxLen = segLen;
          longestIdx = i;
        }
      }
      if (longestIdx >= 0 && maxLen >= 26) {
        WireRenderer.drawSlashBundleIndicator(
          ctx,
          routed[longestIdx],
          routed[longestIdx + 1],
          ctx.strokeStyle,
          3
        );
      }
    }

    ctx.restore();
  }

  /**
   * Distance from point (px, py) to line segment (x1, y1)-(x2, y2)
   */
  static distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  /**
   * Hit test a wire at world coordinates with domain-adjusted tolerance
   */
  static hitTestWire(
    wire: WireData,
    worldX: number,
    worldY: number,
    pinMap?: Map<string, Pin>,
    baseTolerance = 6.0
  ): boolean {
    const domain = WireRenderer.resolveWireDomain(wire, pinMap);
    const tolerance = domain === 'polyphase' ? baseTolerance + 1.5 : baseTolerance;

    const pts = wire.points || [];
    for (let j = 0; j < pts.length - 1; j++) {
      const p1 = pts[j];
      const p2 = pts[j + 1];
      const d = WireRenderer.distToSegment(worldX, worldY, p1.x, p1.y, p2.x, p2.y);
      if (d <= tolerance) {
        return true;
      }
    }
    return false;
  }
}
