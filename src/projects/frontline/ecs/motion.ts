/** Record this frame's displacement as velocity. A blocked or idle unit stays at zero. */
export const writeDisplacementVelocity = function(
  velocity: { x: number; y: number },
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  dt: number,
): void {
  if (!(dt > 0)) {
    velocity.x = 0;
    velocity.y = 0;
    return;
  }
  velocity.x = (toX - fromX) / dt;
  velocity.y = (toY - fromY) / dt;
};
