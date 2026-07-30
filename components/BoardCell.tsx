import React from 'react';
import { Move, RefreshCcw } from 'lucide-react';
import { PieceType, Owner, GRID_SIZE } from '../types';
import { Prism, Block, PowerSupplyPiece, ShooterPiece } from './Pieces';
import { ExplosionEffect, BlockExplosionEffect } from './Effects';

export interface BoardCellProps {
  x: number;
  y: number;
  /** Primitives rather than the cell object: board clones create fresh objects
   *  every turn, which would defeat memoisation if we passed them through. */
  type: PieceType;
  owner: Owner;
  rotation: number;
  health?: number;

  isSelected: boolean;
  isMoveTarget: boolean;
  isAimTarget: boolean;
  showMenu: boolean;
  showRotate: boolean;
  explosion: 'generic' | 'block' | null;
  isExplodingKing: boolean;

  onSelect: (x: number, y: number) => void;
  onPrismAction: (action: 'MOVE' | 'ROTATE') => void;
  onRotate: (deg: number) => void;
}

/**
 * Rotation picker laid out as a 3x3 block centred on the selected prism, so
 * each preview lands exactly on one grid square.
 *
 * The previous version positioned four loose buttons with `translateY(50%)`
 * and lifted them to `translateZ(60px)`. Against the board's
 * `perspective: 1200px` that lift scales them by 1200/(1200-60) — about 5%
 * larger than the squares underneath — and the board's `rotateX(20deg)` tilts
 * the Z axis so the lift also shifts them vertically. Half a cell of offset
 * plus a 5% size mismatch is why they never sat in the grid.
 *
 * Sitting at translateZ(12px) keeps the picker just above the pieces
 * (translateZ(10px)) with a sub-pixel scale difference.
 */
const ROTATION_GRID: { deg: number | null; col: number; row: number }[] = [
  { deg: 0,    col: 2, row: 1 }, // up
  { deg: 90,   col: 3, row: 2 }, // right
  { deg: 180,  col: 2, row: 3 }, // down
  { deg: 270,  col: 1, row: 2 }, // left
  { deg: null, col: 2, row: 2 }  // centre: the prism as it stands now
];

const BoardCellBase: React.FC<BoardCellProps> = ({
  x, y, type, owner, rotation, health,
  isSelected, isMoveTarget, isAimTarget, showMenu, showRotate,
  explosion, isExplodingKing,
  onSelect, onPrismAction, onRotate
}) => {
  const isTopRow = y < 2;
  const isRightEdge = x >= 6;
  // One grid square is a third of the 3x3 picker.
  const nudgeX = x === 0 ? '33.3333%' : x === GRID_SIZE - 1 ? '-33.3333%' : '0%';
  const nudgeY = y === 0 ? '33.3333%' : y === GRID_SIZE - 1 ? '-33.3333%' : '0%';
  const interactive = isMoveTarget || isAimTarget || type !== PieceType.EMPTY;

  return (
    <div
      role="gridcell"
      tabIndex={interactive ? 0 : -1}
      aria-label={`Column ${x + 1}, row ${y + 1}`}
      onClick={() => onSelect(x, y)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(x, y);
        }
      }}
      className={`
        relative border border-[#333] transition-all duration-200 outline-none
        focus-visible:ring-2 focus-visible:ring-[#C2B280] focus-visible:z-40
        ${isSelected ? 'bg-emerald-900/30 shadow-[inset_0_0_20px_rgba(16,185,129,0.4)] border-emerald-500/50' : ''}
        ${isMoveTarget ? 'bg-[#C2B280]/20 cursor-pointer hover:bg-[#C2B280]/40' : ''}
        ${isAimTarget ? 'bg-red-900/20 cursor-crosshair hover:bg-red-900/40' : ''}
      `}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {isMoveTarget && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-2 h-2 bg-[#C2B280] rounded-full animate-ping"></div>
        </div>
      )}

      <div className="w-full h-full relative" style={{ transform: 'translateZ(10px)' }}>
        {type === PieceType.PRISM && <Prism owner={owner} rotation={rotation} />}
        {type === PieceType.BLOCK && <Block health={health} />}
        {type === PieceType.KING && <PowerSupplyPiece owner={owner} />}
        {type === PieceType.SHOOTER && <ShooterPiece owner={owner} rotation={rotation} />}
      </div>

      {explosion === 'block' && <BlockExplosionEffect />}
      {explosion === 'generic' && <ExplosionEffect />}
      {isExplodingKing && <ExplosionEffect />}

      {showMenu && (
        <div
          className={`absolute flex gap-2 z-50 transition-all duration-200
            ${isRightEdge ? 'right-[100%] mr-2 origin-right' : 'left-1/2 -translate-x-1/2 origin-center'}
            ${isTopRow ? 'top-full mt-2' : 'bottom-full mb-2'}`}
          style={{ transform: 'translateZ(60px)' }}
        >
          <button
            onClick={e => { e.stopPropagation(); onPrismAction('MOVE'); }}
            className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1 border border-blue-400 shadow-lg hover:bg-blue-500 flex flex-col items-center rounded-sm"
          >
            <Move size={12} className="mb-1" /> MOVE
          </button>
          <button
            onClick={e => { e.stopPropagation(); onPrismAction('ROTATE'); }}
            className="bg-purple-600 text-white text-[10px] font-bold px-3 py-1 border border-purple-400 shadow-lg hover:bg-purple-500 flex flex-col items-center rounded-sm"
          >
            <RefreshCcw size={12} className="mb-1" /> ROTATE
          </button>
        </div>
      )}

      {showRotate && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            // 300% = three grid squares; -100% re-centres it on this cell.
            left: '-100%',
            top: '-100%',
            width: '300%',
            height: '300%',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(3, 1fr)',
            // Nudge inward at the edges so no preview falls off the board.
            transform: `translateZ(12px) translate(${nudgeX}, ${nudgeY})`
          }}
        >
          {ROTATION_GRID.map(({ deg, col, row }) => {
            if (deg === null) {
              return (
                <div
                  key="current"
                  style={{ gridColumn: col, gridRow: row }}
                  className="relative flex items-center justify-center"
                >
                  <div className="absolute inset-[3px] border border-dashed border-emerald-500/40 bg-black/40"></div>
                  <div className="relative w-full h-full opacity-30">
                    <Prism owner={owner} rotation={rotation} />
                  </div>
                </div>
              );
            }
            const isCurrent = deg === ((rotation % 360) + 360) % 360;
            return (
              <button
                key={deg}
                aria-label={`Rotate to ${deg} degrees`}
                aria-pressed={isCurrent}
                disabled={isCurrent}
                style={{ gridColumn: col, gridRow: row }}
                className="relative flex items-center justify-center pointer-events-auto disabled:cursor-not-allowed group"
                onClick={e => { e.stopPropagation(); onRotate(deg); }}
              >
                <div
                  className={`absolute inset-[3px] border shadow-lg transition-all ${
                    isCurrent
                      ? 'border-[#6E7376]/50 bg-black/70'
                      : 'border-emerald-500 bg-black/90 group-hover:bg-emerald-900/50 group-hover:border-emerald-300'
                  }`}
                ></div>
                <div className={`relative w-full h-full p-[3px] transition-opacity ${isCurrent ? 'opacity-25' : 'opacity-80 group-hover:opacity-100'}`}>
                  <Prism owner={owner} rotation={deg} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const BoardCell = React.memo(BoardCellBase);
BoardCell.displayName = 'BoardCell';
