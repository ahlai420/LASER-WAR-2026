import React, { useCallback, useMemo } from 'react';
import { Board, GRID_SIZE, Owner, Phase, PieceType, Position } from '../types';
import { isPathClear, homeRow } from '../services/gameLogic';
import { BoardCell } from './BoardCell';
import { LaserOverlay } from './Effects';
import { Explosion, InteractionMode, Selection } from '../state/gameReducer';

interface Props {
  board: Board;
  selected: Selection | null;
  interactionMode: InteractionMode;
  actionPoints: number;
  phase: Phase;
  turnOwner: Owner;
  aimUsed: boolean;
  laserPath: Position[];
  laserDispersedFrom: number | null;
  explosions: Explosion[];
  explodingKing: Owner | null;
  onSelect: (x: number, y: number) => void;
  onPrismAction: (action: 'MOVE' | 'ROTATE') => void;
  onRotate: (deg: number) => void;
}

export const GameBoard: React.FC<Props> = ({
  board, selected, interactionMode, actionPoints, phase, turnOwner,
  aimUsed, laserPath, laserDispersedFrom, explosions, explodingKing,
  onSelect, onPrismAction, onRotate
}) => {
  /** Precompute reachable tiles once per render instead of per cell. */
  const moveTargets = useMemo(() => {
    const set = new Set<string>();
    if (interactionMode !== 'MOVE' || !selected) return set;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (board[y][x].type !== PieceType.EMPTY) continue;
        const dist = Math.abs(x - selected.x) + Math.abs(y - selected.y);
        const linear = x === selected.x || y === selected.y;
        if (linear && dist > 0 && dist <= actionPoints && isPathClear(board, selected, { x, y })) {
          set.add(`${x},${y}`);
        }
      }
    }
    return set;
  }, [board, selected, interactionMode, actionPoints]);

  const aimTargets = useMemo(() => {
    const set = new Set<string>();
    if (phase !== Phase.SHOOT || turnOwner !== Owner.PLAYER || aimUsed) return set;
    const row = homeRow(Owner.PLAYER);
    for (let x = 0; x < GRID_SIZE; x++) {
      if (board[row][x].type === PieceType.EMPTY) set.add(`${x},${row}`);
    }
    return set;
  }, [board, phase, turnOwner, aimUsed]);

  const explosionAt = useCallback(
    (x: number, y: number) => explosions.find(e => e.x === x && e.y === y)?.type ?? null,
    [explosions]
  );

  return (
    <div
      className="relative bg-[#1e1e1e] rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.8)] border-4 border-[#424242] transition-all duration-300 w-[min(90vw,55vh)] landscape:w-[min(50vw,90vh)] md:w-[min(60vw,80vh)] aspect-square overflow-visible"
      style={{ transform: 'rotateX(20deg)', transformStyle: 'preserve-3d' }}
    >
      <div
        role="grid"
        aria-label="Laser War board"
        className="absolute inset-0 w-full h-full"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
          transformStyle: 'preserve-3d'
        }}
      >
        {board.map((row, y) =>
          row.map((cell, x) => {
            const isSelected = selected?.x === x && selected?.y === y;
            return (
              <BoardCell
                key={`${x}-${y}`}
                x={x}
                y={y}
                type={cell.type}
                owner={cell.owner}
                rotation={cell.rotation}
                health={cell.health}
                isSelected={isSelected}
                isMoveTarget={moveTargets.has(`${x},${y}`)}
                isAimTarget={aimTargets.has(`${x},${y}`)}
                showMenu={isSelected && interactionMode === 'MENU'}
                showRotate={isSelected && interactionMode === 'ROTATE'}
                explosion={explosionAt(x, y)}
                isExplodingKing={cell.type === PieceType.KING && explodingKing === cell.owner}
                onSelect={onSelect}
                onPrismAction={onPrismAction}
                onRotate={onRotate}
              />
            );
          })
        )}
      </div>

      <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: 'translateZ(20px)' }}>
        <LaserOverlay path={laserPath} dispersedFrom={laserDispersedFrom} />
      </div>
    </div>
  );
};
