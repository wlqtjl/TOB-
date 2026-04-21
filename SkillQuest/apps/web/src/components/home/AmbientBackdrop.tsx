/**
 * AmbientBackdrop — 首页背景氛围层
 *
 * 三个巨大模糊 radial-gradient 色斑（accent / blue / 极淡 red）在固定全屏层缓慢漂移。
 * - 纯 CSS @keyframes + transform，零 JS。
 * - `pointer-events-none` + `-z-10`，不影响交互。
 * - reduced-motion 下保留色斑但停止漂移（见 globals.css）。
 */

export default function AmbientBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="ambient-backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="ambient-blob ambient-blob-a" />
      <div className="ambient-blob ambient-blob-b" />
      <div className="ambient-blob ambient-blob-c" />
    </div>
  );
}
