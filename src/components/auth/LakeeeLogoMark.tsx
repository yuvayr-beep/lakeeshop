import React from 'react';

interface LakeeeLogoMarkProps {
  size?: number;
}

export default function LakeeeLogoMark({ size = 56 }: LakeeeLogoMarkProps) {
  // 4x4 dot matrix forming an E-like pattern
  const dots = [
    // Row 0
    { col: 0, row: 0, filled: true },
    { col: 1, row: 0, filled: true },
    { col: 2, row: 0, filled: true },
    { col: 3, row: 0, filled: false },
    // Row 1
    { col: 0, row: 1, filled: true },
    { col: 1, row: 1, filled: false },
    { col: 2, row: 1, filled: true },
    { col: 3, row: 1, filled: false },
    // Row 2
    { col: 0, row: 2, filled: true },
    { col: 1, row: 2, filled: true },
    { col: 2, row: 2, filled: false },
    { col: 3, row: 2, filled: false },
    // Row 3
    { col: 0, row: 3, filled: true },
    { col: 1, row: 3, filled: false },
    { col: 2, row: 3, filled: true },
    { col: 3, row: 3, filled: true },
  ];

  const dotSize = size / 5;
  const gap = dotSize * 0.35;
  const totalSize = 4 * dotSize + 3 * gap;

  const colors = ['#7CB518', '#A8C256', '#8FB93A', '#6AA010'];

  return (
    <svg
      width={totalSize}
      height={totalSize}
      viewBox={`0 0 ${totalSize} ${totalSize}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {dots.map((dot, i) => {
        const x = dot.col * (dotSize + gap);
        const y = dot.row * (dotSize + gap);
        const colorIndex = (dot.col + dot.row) % colors.length;
        return (
          <rect
            key={`dot-${i}`}
            x={x}
            y={y}
            width={dotSize}
            height={dotSize}
            rx={dotSize * 0.2}
            fill={dot.filled ? colors[colorIndex] : 'rgba(0,0,0,0.06)'}
            opacity={dot.filled ? 1 : 0.4}
          />
        );
      })}
    </svg>
  );
}