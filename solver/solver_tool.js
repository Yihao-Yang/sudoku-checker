import { log_process, show_result } from "./core.js";
import { solve_By_Elimination } from "./Technique.js";
import { state } from "./state.js";
import { get_all_mark_lines, get_cells_on_line } from "../modules/multi_diagonal.js";
import { get_extra_region_cells } from '../modules/extra_region.js';
import { get_renban_cells, is_valid_renban } from '../modules/renban.js';
import { is_valid_fortress } from "../modules/fortress.js";
import { is_valid_clone, get_clone_cells, are_regions_same_shape } from "../modules/clone.js";
import { apply_exclusion_marks, is_valid_exclusion } from "../modules/exclusion.js";
import { apply_quadruple_marks, is_valid_quadruple } from "../modules/quadruple.js";
// import { apply_skyscraper_marks } from "../modules/skyscraper.js"
import { is_valid_add } from "../modules/add.js";
import { is_valid_product } from "../modules/product.js";
import { is_valid_ratio } from "../modules/ratio.js";
import { is_valid_VX } from "../modules/vx.js";
import { is_valid_kropki } from "../modules/kropki.js";
import { is_valid_consecutive } from "../modules/consecutive.js";
import { is_valid_inequality } from "../modules/inequality.js";
import { apply_odd_marks, is_valid_odd } from "../modules/odd.js";
import { apply_odd_even_marks, is_valid_odd_even } from "../modules/odd_even.js";
import { is_valid_anti_king } from "../modules/anti_king.js";
import { is_valid_anti_knight } from "../modules/anti_knight.js";
import { is_valid_anti_elephant } from "../modules/anti_elephant.js";
// import { is_valid_anti_diagonal } from "../modules/anti_diagonal.js";
import { is_valid_palindrome, merge_connected_lines } from "../modules/palindrome.js";
import { get_odd_cells } from '../modules/odd.js';
import { get_odd_even_cells } from '../modules/odd_even.js';
import { is_valid_X_sums, apply_X_sums_marks, X_SUMS_CANDIDATES_MAP } from "../modules/X_sums.js";
import { is_valid_skyscraper, apply_skyscraper_marks } from "../modules/skyscraper.js";
import { is_valid_sandwich } from "../modules/sandwich.js";

export function eliminate_candidates_classic(board, size, i, j, num, calc_score = true) {
    const eliminations = [];
    // 根据当前模式获取所有区域
    const mode = (typeof state !== "undefined" && state.current_mode) ? state.current_mode : "classic";

    // 满格区域
    const regions = get_all_regions(size, mode);
    const related_regions = regions.filter(region =>
        region.cells.some(([r, c]) => r === i && c === j)
    );

    for (const region of related_regions) {
        // 只有区域名字是宫、行、列才会进行删数
        if (region.type !== '宫' && region.type !== '行' && region.type !== '列') {
            continue;
        }
        
        for (const [r, c] of region.cells) {
            if (Array.isArray(board[r][c])) {
                // 新增：无论是否真的被消除，都加分
                if (calc_score) {
                    const key = `${r},${c},${num}`;
                    if (!state.candidate_elimination_score[key]) {
                        state.candidate_elimination_score[key] = 0;
                    }
                    state.candidate_elimination_score[key] += 1;
                    // log_process(`候选数消除分值: [${getRowLetter(r+1)}${c+1}] 候选${num} -> 分值=${state.candidate_elimination_score[key]}`);
                }

                // 只有真的被消除才记录eliminations
                if (Array.isArray(board[r][c])) {
                    const before = board[r][c].slice();
                    board[r][c] = board[r][c].filter(candidate_num => candidate_num !== num);
                    const eliminated = before.filter(candidate_num => candidate_num === num);
                    if (eliminated.length > 0) {
                        eliminations.push({ row: r, col: c, eliminated });
                    }
                }
            }
        }
    }
    return eliminations;
}

/**
 * 从所有相关区域移除指定数字的候选数
 */
export function eliminate_candidates(board, size, i, j, num, calc_score = true) {
    const eliminations = [];
    // 根据当前模式获取所有区域
    const mode = (typeof state !== "undefined" && state.current_mode) ? state.current_mode : "classic";

    // 满格区域
    const regions = get_all_regions(size, mode);
    const related_regions = regions.filter(region =>
        region.cells.some(([r, c]) => r === i && c === j)
    );

    for (const region of related_regions) {
        // 针对有重复四格提示区域，特殊处理
        if (region.type === '有重复四格提示' && Array.isArray(region.clue_nums)) {
            // log_process(`处理特定组合 ${region.index} (${region.type}) 的候选数排除`);
            // 统计该区域内已填入num的数量
            let filledCount = 0;
            for (const [r, c] of region.cells) {
                if (board[r][c] === num) filledCount++;
            }
            // 统计提示数中num的数量
            const clueCount = region.clue_nums.filter(n => n === num).length;
            // 如果已填数量达到提示数量，则删去剩余格子的候选
            if (filledCount >= clueCount) {
                for (const [r, c] of region.cells) {
                    if (Array.isArray(board[r][c])) {
                        if (calc_score) {
                            const key = `${r},${c},${num}`;
                            if (!state.candidate_elimination_score[key]) {
                                state.candidate_elimination_score[key] = 0;
                            }
                            state.candidate_elimination_score[key] += 1;
                        }
                        const before = board[r][c].slice();
                        board[r][c] = board[r][c].filter(candidate_num => candidate_num !== num);
                        const eliminated = before.filter(candidate_num => candidate_num === num);
                        if (eliminated.length > 0) {
                            eliminations.push({ row: r, col: c, eliminated });
                        }
                        // log_process(`候选数消除分值: [${getRowLetter(r+1)}${c+1}] 候选${num} -> 分值=${state.candidate_elimination_score[key]}`);
                    }
                }
                continue; // 已处理该区域，跳过后续处理
            }
            // 如果未达到提示数量，则不删候选
            continue;
        }
        for (const [r, c] of region.cells) {
            if (Array.isArray(board[r][c])) {
                // 新增：无论是否真的被消除，都加分
                if (calc_score) {
                    const key = `${r},${c},${num}`;
                    if (!state.candidate_elimination_score[key]) {
                        state.candidate_elimination_score[key] = 0;
                    }
                    state.candidate_elimination_score[key] += 1;
                    // log_process(`候选数消除分值: [${getRowLetter(r+1)}${c+1}] 候选${num} -> 分值=${state.candidate_elimination_score[key]}`);
                }

                // 只有真的被消除才记录eliminations
                if (Array.isArray(board[r][c])) {
                    const before = board[r][c].slice();
                    board[r][c] = board[r][c].filter(candidate_num => candidate_num !== num);
                    const eliminated = before.filter(candidate_num => candidate_num === num);
                    if (eliminated.length > 0) {
                        eliminations.push({ row: r, col: c, eliminated });
                    }
                }
            }
        }
    }

    // 堡垒数独模式下的特殊处理
    if (mode === 'fortress') {
        const directions = [
            [-1, 0], // 上
            [1, 0],  // 下
            [0, -1], // 左
            [0, 1],  // 右
        ];
        const cell_key = `${i},${j}`;
        const is_gray = state.fortress_cells.has(cell_key); // 判断当前格子是否为灰格

        for (const [dr, dc] of directions) {
            const nr = i + dr;
            const nc = j + dc;

            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                const neighbor_key = `${nr},${nc}`;
                const is_neighbor_gray = state.fortress_cells.has(neighbor_key);

                if (is_gray && !is_neighbor_gray) {
                    // 当前格子是灰格，邻居是白格
                    if (Array.isArray(board[nr][nc])) {
                        for (let k = board[nr][nc].length - 1; k >= 0; k--) {
                            const candidate = board[nr][nc][k];
                            if (candidate > num) {
                                if (calc_score) {
                                    state.candidate_elimination_score[`${nr},${nc},${candidate}`] = 1;
                                }
                                eliminations.push({ row: nr, col: nc, val: candidate });
                                board[nr][nc].splice(k, 1);
                            }
                        }
                    }
                } else if (!is_gray && is_neighbor_gray) {
                    // 当前格子是白格，邻居是灰格
                    if (Array.isArray(board[nr][nc])) {
                        for (let k = board[nr][nc].length - 1; k >= 0; k--) {
                            const candidate = board[nr][nc][k];
                            if (candidate < num) {
                                if (calc_score) {
                                    state.candidate_elimination_score[`${nr},${nc},${candidate}`] = 1;
                                }
                                eliminations.push({ row: nr, col: nc, val: candidate });
                                board[nr][nc].splice(k, 1);
                            }
                        }
                    }
                }
            }
        }
    }
    // Anti-King模式下，斜对角格也要删除候选
    else if (mode === 'anti_king') {
        const king_moves = [
            [-1, -1], [-1, 1],
            [1, -1], [1, 1]
        ];
        for (const [dr, dc] of king_moves) {
            const nr = i + dr;
            const nc = j + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                if (Array.isArray(board[nr][nc])) {
                    if (calc_score) {
                        const key = `${nr},${nc},${num}`;
                        if (!state.candidate_elimination_score[key]) {
                            state.candidate_elimination_score[key] = 0;
                        }
                        state.candidate_elimination_score[key] += 1;
                    }
                    const before = board[nr][nc].slice();
                    board[nr][nc] = board[nr][nc].filter(candidate_num => candidate_num !== num);
                    const eliminated = before.filter(candidate_num => candidate_num === num);
                    if (eliminated.length > 0) {
                        eliminations.push({ row: nr, col: nc, eliminated });
                    }
                }
            }
        }
    } else if (mode === 'anti_knight') {
        const knight_moves = [
            [-2, -1], [-2, 1],
            [2, -1], [2, 1],
            [-1, -2], [-1, 2],
            [1, -2], [1, 2]
        ];
        for (const [dr, dc] of knight_moves) {
            const nr = i + dr;
            const nc = j + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                if (Array.isArray(board[nr][nc])) {
                    if (calc_score) {
                        const key = `${nr},${nc},${num}`;
                        if (!state.candidate_elimination_score[key]) {
                            state.candidate_elimination_score[key] = 0;
                        }
                        state.candidate_elimination_score[key] += 1;
                    }
                    const before = board[nr][nc].slice();
                    board[nr][nc] = board[nr][nc].filter(candidate_num => candidate_num !== num);
                    const eliminated = before.filter(candidate_num => candidate_num === num);
                    if (eliminated.length > 0) {
                        eliminations.push({ row: nr, col: nc, eliminated });
                    }
                }
            }
        }
    } else if (mode === 'anti_elephant') {
        const elephant_moves = [
            [-2, -2], [-2, 2],
            [2, -2], [2, 2]
        ];
        for (const [dr, dc] of elephant_moves) {
            const nr = i + dr;
            const nc = j + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                if (Array.isArray(board[nr][nc])) {
                    if (calc_score) {
                        const key = `${nr},${nc},${num}`;
                        if (!state.candidate_elimination_score[key]) {
                            state.candidate_elimination_score[key] = 0;
                        }
                        state.candidate_elimination_score[key] += 1;
                    }
                    const before = board[nr][nc].slice();
                    board[nr][nc] = board[nr][nc].filter(candidate_num => candidate_num !== num);
                    const eliminated = before.filter(candidate_num => candidate_num === num);
                    if (eliminated.length > 0) {
                        eliminations.push({ row: nr, col: nc, eliminated });
                    }
                }
            }
        }
    }
    // VX 模式专用候选数处理：
    // - 若两格之间有 V/X 标记：把另一个格的候选限制为能与已放数字 num 配对满足标记和（V=>5, X=>10）
    // - 若两格之间未标记：删除会与 num 形成和为 5 或 10 的候选
    else if (mode === 'VX') {
        try {
            const container = typeof document !== 'undefined' ? document.querySelector('.sudoku-container') : null;
            const neighbors = [
                [0, 1], [0, -1], [1, 0], [-1, 0]
            ];
            for (const [dr, dc] of neighbors) {
                const nr = i + dr;
                const nc = j + dc;
                if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;

                // 构造标记 key（与 vx.js 的约定一致）
                let key = null;
                if (nr === i && Math.abs(nc - j) === 1) {
                    const minCol = Math.min(nc, j);
                    key = `v-${i}-${minCol + 1}`;
                } else if (nc === j && Math.abs(nr - i) === 1) {
                    const minRow = Math.min(nr, i);
                    key = `h-${minRow + 1}-${j}`;
                }

                const mark = container && key ? container.querySelector(`.vx-mark[data-key="${key}"]`) : null;
                const rawType = mark ? (mark.dataset.vxType || mark.querySelector('input')?.value || '').toUpperCase() : null;
                const isMarkedV = rawType === 'V';
                const isMarkedX = rawType === 'X';

                // 目标：若 board[nr][nc] 是候选数组，则根据标记情况调整候选集合并记录被删除的候选
                if (Array.isArray(board[nr][nc])) {
                    const before = board[nr][nc].slice();
                    let after = before.slice();

                    if (isMarkedV || isMarkedX) {
                        const required = isMarkedV ? 5 : 10;
                        // 仅保留能与 num 配对满足 required 的候选
                        after = before.filter(c => (c + num) === required);
                    } else {
                        // 未标记：删除会与 num 构成和为5或10的候选
                        after = before.filter(c => !((c + num) === 5 || (c + num) === 10));
                    }

                    // 记录分值（与其他分值记录方式保持一致）
                    if (calc_score) {
                        for (const removed of before) {
                            if (!after.includes(removed)) {
                                const scoreKey = `${nr},${nc},${removed}`;
                                if (!state.candidate_elimination_score[scoreKey]) {
                                    state.candidate_elimination_score[scoreKey] = 0;
                                }
                                state.candidate_elimination_score[scoreKey] += 1;
                            }
                        }
                    }

                    board[nr][nc] = after;
                    const eliminated = before.filter(x => !after.includes(x));
                    if (eliminated.length > 0) {
                        eliminations.push({ row: nr, col: nc, eliminated });
                    }
                } else {
                    // 若邻格已被固定数字且未标记且与 num 和为 5/10，则这是矛盾（通常由 isValid 检出），此处不做修改
                }
            }
        } catch (e) {
            // 容错：在无 DOM 环境或查询失败时不阻塞主流程
            // console.warn && console.warn('VX elimination error', e);
        }
    } // Kropki（黑白点）模式专用候选数处理
    else if (mode === 'kropki') {
        const container = (typeof document !== "undefined") ? document.querySelector('.sudoku-container') : null;
        // 收集所有黑白点标记
        const kropkiMarks = [];
        const kropkiMarkKeySet = new Set();
        if (container) {
            container.querySelectorAll('.vx-mark[data-key]').forEach(mark => {
                const key = mark.dataset.key;
                const type = (mark.dataset.kropkiType || '').toUpperCase();
                if (type === 'B' || type === 'W') {
                    // 解析key
                    let pair = null;
                    if (key.startsWith('v-')) {
                        const [_, r, c] = key.split('-').map(Number);
                        pair = { row1: r, col1: c - 1, row2: r, col2: c };
                    } else if (key.startsWith('h-')) {
                        const [_, r, c] = key.split('-').map(Number);
                        pair = { row1: r - 1, col1: c, row2: r, col2: c };
                    }
                    if (pair) {
                        kropkiMarks.push({ ...pair, type });
                        kropkiMarkKeySet.add(`${pair.row1},${pair.col1},${pair.row2},${pair.col2}`);
                        kropkiMarkKeySet.add(`${pair.row2},${pair.col2},${pair.row1},${pair.col1}`);
                    }
                }
            });
        }
        // 所有相邻格对
        const allAdjacentPairs = [];
        for (let drc of [[0,1],[1,0]]) {
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    const nr = r + drc[0], nc = c + drc[1];
                    if (nr < size && nc < size) {
                        allAdjacentPairs.push({ row1: r, col1: c, row2: nr, col2: nc });
                    }
                }
            }
        }
        // 针对所有与(i,j)相邻的格
        for (const pair of allAdjacentPairs) {
            let otherRow, otherCol;
            if (pair.row1 === i && pair.col1 === j) {
                otherRow = pair.row2; otherCol = pair.col2;
            } else if (pair.row2 === i && pair.col2 === j) {
                otherRow = pair.row1; otherCol = pair.col1;
            } else continue;
            if (!Array.isArray(board[otherRow][otherCol])) continue;
            // 是否有黑白点标记
            const hasMark = kropkiMarkKeySet.has(`${i},${j},${otherRow},${otherCol}`);
            if (hasMark) {
                // 查找标记类型
                const mark = kropkiMarks.find(m =>
                    (m.row1 === i && m.col1 === j && m.row2 === otherRow && m.col2 === otherCol) ||
                    (m.row2 === i && m.col2 === j && m.row1 === otherRow && m.col1 === otherCol)
                );
                if (!mark) continue;
                if (mark.type === 'B') {
                    // 黑点，两格为2倍关系
                    // num是已填，other格候选只能是num*2或num/2（且在1~size范围内且为整数）
                    const allowed = [];
                    if (num * 2 <= size) allowed.push(num * 2);
                    if (num % 2 === 0 && num / 2 >= 1) allowed.push(num / 2);
                    for (let k = board[otherRow][otherCol].length - 1; k >= 0; k--) {
                        if (!allowed.includes(board[otherRow][otherCol][k])) {
                            if (calc_score) state.candidate_elimination_score[`${otherRow},${otherCol},${board[otherRow][otherCol][k]}`] = 1;
                            eliminations.push({ row: otherRow, col: otherCol, val: board[otherRow][otherCol][k] });
                            board[otherRow][otherCol].splice(k, 1);
                        }
                    }
                } else if (mark.type === 'W') {
                    // 白点，两格差1
                    const allowed = [];
                    if (num + 1 <= size) allowed.push(num + 1);
                    if (num - 1 >= 1) allowed.push(num - 1);
                    for (let k = board[otherRow][otherCol].length - 1; k >= 0; k--) {
                        if (!allowed.includes(board[otherRow][otherCol][k])) {
                            if (calc_score) state.candidate_elimination_score[`${otherRow},${otherCol},${board[otherRow][otherCol][k]}`] = 1;
                            eliminations.push({ row: otherRow, col: otherCol, val: board[otherRow][otherCol][k] });
                            board[otherRow][otherCol].splice(k, 1);
                        }
                    }
                }
            } else {
                // 没有标记，不能满足黑点或白点关系
                for (let k = board[otherRow][otherCol].length - 1; k >= 0; k--) {
                    const v = board[otherRow][otherCol][k];
                    // 黑点关系
                    const isDouble = (num === v * 2 || v === num * 2);
                    // 白点关系
                    const isNeighbor = (Math.abs(num - v) === 1);
                    if (isDouble || isNeighbor) {
                        if (calc_score) state.candidate_elimination_score[`${otherRow},${otherCol},${v}`] = 1;
                        eliminations.push({ row: otherRow, col: otherCol, val: v });
                        board[otherRow][otherCol].splice(k, 1);
                    }
                }
            }
        }
    } 
    // else if (mode === 'consecutive') {
    //     const container = (typeof document !== "undefined") ? document.querySelector('.sudoku-container') : null;
    //     const consecutiveMarkType = new Map();
    //     if (container) {
    //         container.querySelectorAll('.vx-mark[data-key]').forEach(mark => {
    //             const key = mark.dataset.key;
    //             const rawType = (mark.dataset.consecutiveType || '').toUpperCase();
    //             if (!key || (rawType !== 'W' && rawType !== 'B')) return;
    //             const parts = key.split('-');
    //             if (parts.length < 3) return;
    //             const rowToken = Number(parts[1]);
    //             const colToken = Number(parts[2]);
    //             if (Number.isNaN(rowToken) || Number.isNaN(colToken)) return;
    //             let pair = null;
    //             if (key.startsWith('v-')) {
    //                 pair = { row1: rowToken, col1: colToken - 1, row2: rowToken, col2: colToken };
    //             } else if (key.startsWith('h-')) {
    //                 pair = { row1: rowToken - 1, col1: colToken, row2: rowToken, col2: colToken };
    //             }
    //             if (!pair) return;
    //             const forward = `${pair.row1},${pair.col1},${pair.row2},${pair.col2}`;
    //             const reverse = `${pair.row2},${pair.col2},${pair.row1},${pair.col1}`;
    //             consecutiveMarkType.set(forward, 'W');
    //             consecutiveMarkType.set(reverse, 'W');
    //         });
    //     }

    //     const allAdjacentPairs = [];
    //     for (const [dr, dc] of [[0, 1], [1, 0]]) {
    //         for (let r = 0; r < size; r++) {
    //             for (let c = 0; c < size; c++) {
    //                 const nr = r + dr;
    //                 const nc = c + dc;
    //                 if (nr < size && nc < size) {
    //                     allAdjacentPairs.push({ row1: r, col1: c, row2: nr, col2: nc });
    //                 }
    //             }
    //         }
    //     }

    //     for (const pair of allAdjacentPairs) {
    //         let otherRow;
    //         let otherCol;
    //         if (pair.row1 === i && pair.col1 === j) {
    //             otherRow = pair.row2;
    //             otherCol = pair.col2;
    //         } else if (pair.row2 === i && pair.col2 === j) {
    //             otherRow = pair.row1;
    //             otherCol = pair.col1;
    //         } else {
    //             continue;
    //         }
    //         if (!Array.isArray(board[otherRow][otherCol])) continue;

    //         const relationKey = `${i},${j},${otherRow},${otherCol}`;
    //         const hasMark = consecutiveMarkType.has(relationKey);
    //         if (hasMark) {
    //             const allowed = [];
    //             if (num + 1 <= size) allowed.push(num + 1);
    //             if (num - 1 >= 1) allowed.push(num - 1);
    //             for (let k = board[otherRow][otherCol].length - 1; k >= 0; k--) {
    //                 const candidate = board[otherRow][otherCol][k];
    //                 if (!allowed.includes(candidate)) {
    //                     if (calc_score) {
    //                         state.candidate_elimination_score[`${otherRow},${otherCol},${candidate}`] = 1;
    //                     }
    //                     eliminations.push({ row: otherRow, col: otherCol, val: candidate });
    //                     board[otherRow][otherCol].splice(k, 1);
    //                 }
    //             }
    //         } else {
    //             for (let k = board[otherRow][otherCol].length - 1; k >= 0; k--) {
    //                 const candidate = board[otherRow][otherCol][k];
    //                 if (Math.abs(num - candidate) === 1) {
    //                     if (calc_score) {
    //                         state.candidate_elimination_score[`${otherRow},${otherCol},${candidate}`] = 1;
    //                     }
    //                     eliminations.push({ row: otherRow, col: otherCol, val: candidate });
    //                     board[otherRow][otherCol].splice(k, 1);
    //                 }
    //             }
    //         }
    //     }
    // }
    // 不等号数独模式专用候选数处理
    else if (mode === 'inequality') {
        const container = (typeof document !== "undefined") ? document.querySelector('.sudoku-container') : null;
        if (container) {
            const marks = container.querySelectorAll('.vx-mark[data-key]');
            for (const mark of marks) {
                const key = mark.dataset.key;
                if (!key) continue;

                // 解析标记对应的两格
                let cell_a, cell_b;
                if (key.startsWith('v-')) {
                    const [_, row_str, col_str] = key.split('-');
                    const r = parseInt(row_str);
                    const c = parseInt(col_str);
                    cell_a = [r, c - 1]; // Left
                    cell_b = [r, c];     // Right
                } else if (key.startsWith('h-')) {
                    const [_, row_str, col_str] = key.split('-');
                    const r = parseInt(row_str);
                    const c = parseInt(col_str);
                    cell_a = [r - 1, c]; // Top
                    cell_b = [r, c];     // Bottom
                } else {
                    continue;
                }

                // 判断当前格是否与标记关联
                let other_cell;
                if (i === cell_a[0] && j === cell_a[1]) {
                    other_cell = cell_b;
                } else if (i === cell_b[0] && j === cell_b[1]) {
                    other_cell = cell_a;
                } else {
                    continue; // 当前格与此标记无关
                }

                // 只有另一个格子有候选数时才处理
                if (!Array.isArray(board[other_cell[0]][other_cell[1]])) continue;

                // 获取标记符号
                const symbolDiv = mark.querySelector('div');
                const symbol = symbolDiv ? symbolDiv.textContent : null;

                if (symbol === '>') {
                    // cell_a > cell_b，即当前格 > 另一格
                    if (i === cell_a[0] && j === cell_a[1]) {
                        // 当前格 > 另一格，所以另一格的候选必须 < num
                        for (let k = board[other_cell[0]][other_cell[1]].length - 1; k >= 0; k--) {
                            const candidate = board[other_cell[0]][other_cell[1]][k];
                            if (candidate >= num) {
                                if (calc_score) {
                                    state.candidate_elimination_score[`${other_cell[0]},${other_cell[1]},${candidate}`] = 1;
                                }
                                eliminations.push({ row: other_cell[0], col: other_cell[1], val: candidate });
                                board[other_cell[0]][other_cell[1]].splice(k, 1);
                            }
                        }
                    } else {
                        // 另一格 > 当前格，所以当前格的候选必须 < num，另一格的候选必须 > num
                        for (let k = board[other_cell[0]][other_cell[1]].length - 1; k >= 0; k--) {
                            const candidate = board[other_cell[0]][other_cell[1]][k];
                            if (candidate <= num) {
                                if (calc_score) {
                                    state.candidate_elimination_score[`${other_cell[0]},${other_cell[1]},${candidate}`] = 1;
                                }
                                eliminations.push({ row: other_cell[0], col: other_cell[1], val: candidate });
                                board[other_cell[0]][other_cell[1]].splice(k, 1);
                            }
                        }
                    }
                } else if (symbol === '<') {
                    // cell_a < cell_b，即当前格 < 另一格
                    if (i === cell_a[0] && j === cell_a[1]) {
                        // 当前格 < 另一格，所以另一格的候选必须 > num
                        for (let k = board[other_cell[0]][other_cell[1]].length - 1; k >= 0; k--) {
                            const candidate = board[other_cell[0]][other_cell[1]][k];
                            if (candidate <= num) {
                                if (calc_score) {
                                    state.candidate_elimination_score[`${other_cell[0]},${other_cell[1]},${candidate}`] = 1;
                                }
                                eliminations.push({ row: other_cell[0], col: other_cell[1], val: candidate });
                                board[other_cell[0]][other_cell[1]].splice(k, 1);
                            }
                        }
                    } else {
                        // 另一格 < 当前格，所以当前格的候选必须 > num，另一格的候选必须 < num
                        for (let k = board[other_cell[0]][other_cell[1]].length - 1; k >= 0; k--) {
                            const candidate = board[other_cell[0]][other_cell[1]][k];
                            if (candidate >= num) {
                                if (calc_score) {
                                    state.candidate_elimination_score[`${other_cell[0]},${other_cell[1]},${candidate}`] = 1;
                                }
                                eliminations.push({ row: other_cell[0], col: other_cell[1], val: candidate });
                                board[other_cell[0]][other_cell[1]].splice(k, 1);
                            }
                        }
                    }
                }
            }
        }
    }
    return eliminations;
}

// 在文件顶部添加缓存变量
let _regions_cache = null;
let _regions_cache_size = 0;
let _regions_cache_mode = '';
// 在文件顶部添加特定组合区域的缓存变量（放在 _regions_cache 附近）
let _special_regions_cache = null;
let _special_regions_cache_size = 0;
let _special_regions_cache_mode = '';

// 添加一个使缓存失效的函数（当标记改变时调用）
export function invalidate_regions_cache() {
    _regions_cache = null;
    _special_regions_cache = null;
}

// 获取所有区域（宫、行、列、对角线、额外区域）格子坐标
export function get_all_regions(size, mode = 'classic') {
    // 检查缓存是否有效
    if (_regions_cache && _regions_cache_size === size && _regions_cache_mode === mode) {
        return _regions_cache;
    }

    const regions = [];
    const box_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];

    // 宫
    for (let box_row = 0; box_row < size / box_size[0]; box_row++) {
        for (let box_col = 0; box_col < size / box_size[1]; box_col++) {
            const region_cells = [];
            for (let r = box_row * box_size[0]; r < (box_row + 1) * box_size[0]; r++) {
                for (let c = box_col * box_size[1]; c < (box_col + 1) * box_size[1]; c++) {
                    region_cells.push([r, c]);
                }
            }
            regions.push({ type: '宫', index: box_row * (size / box_size[1]) + box_col + 1, cells: region_cells });
        }
    }
    // 行
    for (let row = 0; row < size; row++) {
        const region_cells = [];
        for (let col = 0; col < size; col++) {
            region_cells.push([row, col]);
        }
        regions.push({ type: '行', index: row + 1, cells: region_cells });
    }
    // 列
    for (let col = 0; col < size; col++) {
        const region_cells = [];
        for (let row = 0; row < size; row++) {
            region_cells.push([row, col]);
        }
        regions.push({ type: '列', index: col + 1, cells: region_cells });
    }
    // 对角线
    if (mode === 'diagonal') {
        const diag1_cells = [];
        const diag2_cells = [];
        for (let i = 0; i < size; i++) {
            diag1_cells.push([i, i]);
            diag2_cells.push([i, size - 1 - i]);
        }
        regions.push({ type: '对角线', index: 1, cells: diag1_cells });
        regions.push({ type: '对角线', index: 2, cells: diag2_cells });
    }
    // 新增反对角区域
    else if (mode === 'anti_diagonal') {
        if (size === 6) {
            const extra_region_1 = [
                // 一宫在对角线上的格子
                [0, 0], [1, 1],
                // 六宫不在对角线上的格子
                [4, 3], [4, 5], [5, 3], [5, 4]
            ];
            const index_1 = extra_region_1
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '主反对角', index_1, cells: extra_region_1 });
            const extra_region_2 = [
                // 六宫在对角线上的格子
                [4, 4], [5, 5],
                // 一宫不在对角线上的格子
                [0, 1], [0, 2], [1, 0], [1, 2]
            ];
            const index_2 = extra_region_2
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '主反对角', index_2, cells: extra_region_2 });
            const extra_region_3 = [
                // 三宫在对角线上的格子
                [2, 2],
                // 一宫不在对角线上的格子
                [0, 1], [0, 2], [1, 0], [1, 2]
            ];
            const index_3 = extra_region_3
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '主反对角', index_3, cells: extra_region_3 });
            const extra_region_4 = [
                // 四宫在对角线上的格子
                [3, 3],
                // 一宫不在对角线上的格子
                [0, 1], [0, 2], [1, 0], [1, 2]
            ];
            const index_4 = extra_region_4
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '主反对角', index_4, cells: extra_region_4 });
            const extra_region_5 = [
                // 三宫在对角线上的格子
                [2, 2],
                // 六宫不在对角线上的格子
                [4, 3], [4, 5], [5, 3], [5, 4]
            ];
            const index_5 = extra_region_5
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '主反对角', index_5, cells: extra_region_5 });
            const extra_region_6 = [
                // 四宫在对角线上的格子
                [3, 3],
                // 六宫不在对角线上的格子
                [4, 3], [4, 5], [5, 3], [5, 4]
            ];
            const index_6 = extra_region_6
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '主反对角', index_6, cells: extra_region_6 });
            // 以下为副反对角（左下到右上）对应的镜像区域（size = 6）
            const anti_extra_region_1 = [
                // 对应主对角 [0,0],[1,1] -> 镜像为 [0,5],[1,4]
                [0, 5], [1, 4],
                // 对应主对角的其他格子镜像
                [4, 2], [4, 0], [5, 2], [5, 1]
            ];
            const anti_index_1 = anti_extra_region_1
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '副反对角', index: anti_index_1, cells: anti_extra_region_1 });
            const anti_extra_region_2 = [
                // 对应主对角 [4,4],[5,5] -> 镜像为 [4,1],[5,0]
                [4, 1], [5, 0],
                // 对应主对角的一宫不在对角线上的格子镜像
                [0, 4], [0, 3], [1, 5], [1, 3]
            ];
            const anti_index_2 = anti_extra_region_2
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '副反对角', index: anti_index_2, cells: anti_extra_region_2 });
            const anti_extra_region_3 = [
                // 对应主对角 [2,2] -> 镜像为 [2,3]
                [2, 3],
                // 一宫不在对角线上的格子镜像
                [0, 4], [0, 3], [1, 5], [1, 3]
            ];
            const anti_index_3 = anti_extra_region_3
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '副反对角', index: anti_index_3, cells: anti_extra_region_3 });
            const anti_extra_region_4 = [
                // 对应主对角 [3,3] -> 镜像为 [3,2]
                [3, 2],
                // 一宫不在对角线上的格子镜像
                [0, 4], [0, 3], [1, 5], [1, 3]
            ];
            const anti_index_4 = anti_extra_region_4
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '副反对角', index: anti_index_4, cells: anti_extra_region_4 });

            const anti_extra_region_5 = [
                // 对应主对角 [2,2] -> 镜像为 [2,3]
                [2, 3],
                // 对应主对角的六宫不在对角线上的格子镜像
                [4, 2], [4, 0], [5, 2], [5, 1]
            ];
            const anti_index_5 = anti_extra_region_5
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '副反对角', index: anti_index_5, cells: anti_extra_region_5 });
            const anti_extra_region_6 = [
                // 对应主对角 [3,3] -> 镜像为 [3,2]
                [3, 2],
                // 对应主对角的六宫不在对角线上的格子镜像
                [4, 2], [4, 0], [5, 2], [5, 1]
            ];
            const anti_index_6 = anti_extra_region_6
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '副反对角', index: anti_index_6, cells: anti_extra_region_6 });
        } else if (size === 9) {
            const extra_region_1 = [
                // 一宫在对角线上的格子
                [0, 0], [1, 1], [2, 2],
                // 五宫不在对角线上的格子
                [3, 4], [3, 5], [4, 3], [4, 5], [5, 3], [5, 4]
            ];
            const extra_index_1 = extra_region_1
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '主反对角', index: extra_index_1, cells: extra_region_1 });
            // 第二个反对角区域
            const extra_region_2 = [
                [0, 0], [1, 1], [2, 2], // 一宫在对角线上的格子
                [6, 7], [6, 8], [7, 8], [7, 6], [8, 6], [8, 7] // 九宫不在对角线上的格子
            ];
            const extra_index_2 = extra_region_2
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '主反对角', index: extra_index_2, cells: extra_region_2 });
            const extra_region_3 = [
                [3, 3], [4, 4], [5, 5], // 五宫在对角线上的格子
                [0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1] // 一宫不在对角线上的格子
            ];
            const extra_index_3 = extra_region_3
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '主反对角', index: extra_index_3, cells: extra_region_3 });
            const extra_region_4 = [
                [3, 3], [4, 4], [5, 5], // 五宫在对角线上的格子
                [6, 7], [6, 8], [7, 8], [7, 6], [8, 6], [8, 7] // 九宫不在对角线上的格子
            ];
            const extra_index_4 = extra_region_4
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '主反对角', index: extra_index_4, cells: extra_region_4 });
            const extra_region_5 = [
                [6, 6], [7, 7], [8, 8], // 九宫在对角线上的格子
                [0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1] // 一宫不在对角线上的格子
            ];
            const extra_index_5 = extra_region_5
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '主反对角', index: extra_index_5, cells: extra_region_5 });
            const extra_region_6 = [
                [6, 6], [7, 7], [8, 8], // 九宫在对角线上的格子
                [3, 4], [3, 5], [4, 3], [4, 5], [5, 3], [5, 4] // 五宫不在对角线上的格子
            ];
            const extra_index_6 = extra_region_6
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '主反对角', index: extra_index_6, cells: extra_region_6 });
            // 左下到右上的副对角线区域
            const extra_region_7 = [
                // 一宫在副对角线上的格子
                [0, 8], [1, 7], [2, 6],
                // 五宫不在副对角线上的格子
                [3, 3], [3, 4], [4, 3], [4, 5], [5, 4], [5, 5]
            ];
            const extra_index_7 = extra_region_7
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '副反对角', index: extra_index_7, cells: extra_region_7 });

            // 第二个副对角区域
            const extra_region_8 = [
                [0, 8], [1, 7], [2, 6], // 一宫在副对角线上的格子
                [6, 1], [6, 0], [7, 0], [7, 2], [8, 2], [8, 1] // 九宫不在副对角线上的格子
            ];
            const extra_index_8 = extra_region_8
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '副反对角', index: extra_index_8, cells: extra_region_8 });

            const extra_region_9 = [
                [3, 5], [4, 4], [5, 3], // 五宫在副对角线上的格子
                [0, 6], [0, 7], [1, 6], [1, 8], [2, 7], [2, 8] // 一宫不在副对角线上的格子
            ];
            const extra_index_9 = extra_region_9
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '副反对角', index: extra_index_9, cells: extra_region_9 });

            const extra_region_10 = [
                [3, 5], [4, 4], [5, 3], // 五宫在副对角线上的格子
                [6, 1], [6, 0], [7, 0], [7, 2], [8, 2], [8, 1] // 九宫不在副对角线上的格子
            ];
            const extra_index_10 = extra_region_10
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '副反对角', index: extra_index_10, cells: extra_region_10 });

            const extra_region_11 = [
                [6, 2], [7, 1], [8, 0], // 九宫在副对角线上的格子
                [0, 6], [0, 7], [1, 6], [1, 8], [2, 7], [2, 8] // 一宫不在副对角线上的格子
            ];
            const extra_index_11 = extra_region_11
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '副反对角', index: extra_index_11, cells: extra_region_11 });

            const extra_region_12 = [
                [6, 2], [7, 1], [8, 0], // 九宫在副对角线上的格子
                [3, 3], [3, 4], [4, 3], [4, 5], [5, 4], [5, 5] // 五宫不在副对角线上的格子
            ];
            const extra_index_12 = extra_region_12
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '副反对角', index: extra_index_12, cells: extra_region_12 });
        }
    }
    // 井字线
    else if (mode === 'hashtag') {
        // 根据您绘制的四条线定义井字线区域
        if (size === 9) {
            // 第一条线：对应从第1行第1列到第5行最后一列的斜线
            const line1_cells = [
                [0, 0], [1, 1], [1, 2], [2, 3], [2, 4], [3, 5], [3, 6], [4, 7], [4, 8]
            ];
            const index_line1 = line1_cells
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '井字线', index: index_line1, cells: line1_cells });
            // 第二条线：第一条线向下平移3.5格
            const line2_cells = [
                [4, 0], [4, 1], [5, 2], [5, 3], [6, 4], [6, 5], [7, 6], [7, 7], [8, 8]
            ];
            const index_line2 = line2_cells
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '井字线', index: index_line2, cells: line2_cells });

            // 第三条线：对应从最后1行第1列到第1行第5列的斜线
            const line3_cells = [
                [0, 4], [1, 4], [2, 3], [3, 3], [4, 2], [5, 2], [6, 1], [7, 1], [8, 0]
            ];
            const index_line3 = line3_cells
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '井字线', index: index_line3, cells: line3_cells });

            // 第四条线：第三条线向右平移3.5格
            const line4_cells = [
                [0, 8], [1, 7], [2, 7], [3, 6], [4, 6], [5, 5], [6, 5], [7, 4], [8, 4]
            ];
            const index_line4 = line4_cells
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '井字线', index: index_line4, cells: line4_cells });
        } else if (size === 6) {
            // size 等于 6 的情况（新逻辑）
            const line1_cells = [
                [0, 0], [1, 1], [1, 2], [2, 3], [2, 4], [3, 5]
            ];
            const index_line1 = line1_cells
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '井字线', index: index_line1, cells: line1_cells });

            const line2_cells = [
                [2, 0], [3, 1], [3, 2], [4, 3], [4, 4], [5, 5]
            ];
            const index_line2 = line2_cells
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '井字线', index: index_line2, cells: line2_cells });

            const line3_cells = [
                [0, 3], [1, 2], [2, 2], [3, 1], [4, 1], [5, 0]
            ];
            const index_line3 = line3_cells
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '井字线', index: index_line3, cells: line3_cells });

            const line4_cells = [
                [0, 5], [1, 4], [2, 4], [3, 3], [4, 3], [5, 2]
            ];
            const index_line4 = line4_cells
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '井字线', index: index_line4, cells: line4_cells });
        }
    }
    // 多斜线
    else if (mode === 'multi_diagonal') {
        const mark_lines = get_all_mark_lines();
        let lineIndex = 1;
        for (const [start, end] of mark_lines) {
            const cells = get_cells_on_line(size, start, end);
            const index = cells
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({ type: '斜线', index, cells });
        }
    }
    // 窗口数独四个窗口区域
    else if (mode === 'window' && size === 9) {
        // 左上窗口
        const window1 = [];
        for (let r = 1; r <= 3; r++) {
            for (let c = 1; c <= 3; c++) {
                window1.push([r, c]);
            }
        }
        regions.push({ type: '窗口', index: 1, cells: window1 });

        // 右上窗口
        const window2 = [];
        for (let r = 1; r <= 3; r++) {
            for (let c = 5; c <= 7; c++) {
                window2.push([r, c]);
            }
        }
        regions.push({ type: '窗口', index: 2, cells: window2 });

        // 左下窗口
        const window3 = [];
        for (let r = 5; r <= 7; r++) {
            for (let c = 1; c <= 3; c++) {
                window3.push([r, c]);
            }
        }
        regions.push({ type: '窗口', index: 3, cells: window3 });

        // 右下窗口
        const window4 = [];
        for (let r = 5; r <= 7; r++) {
            for (let c = 5; c <= 7; c++) {
                window4.push([r, c]);
            }
        }
        regions.push({ type: '窗口', index: 4, cells: window4 });
        // 隐藏宫1：第1~3列，去掉1~3行和5~7行
        const hidden_box1 = [];
        for (let r = 0; r < 9; r++) {
            if (r >= 1 && r <= 3) continue;
            if (r >= 5 && r <= 7) continue;
            for (let c = 1; c <= 3; c++) {
                hidden_box1.push([r, c]);
            }
        }
        regions.push({ type: '隐藏宫', index: 1, cells: hidden_box1 });

        // 隐藏宫2：第5~7列，去掉1~3行和5~7行
        const hidden_box2 = [];
        for (let r = 0; r < 9; r++) {
            if (r >= 1 && r <= 3) continue;
            if (r >= 5 && r <= 7) continue;
            for (let c = 5; c <= 7; c++) {
                hidden_box2.push([r, c]);
            }
        }
        regions.push({ type: '隐藏宫', index: 2, cells: hidden_box2 });

        // 隐藏宫3：第1~3行，去掉1~3列和5~7列
        const hidden_box3 = [];
        for (let r = 1; r <= 3; r++) {
            for (let c = 0; c < 9; c++) {
                if (c >= 1 && c <= 3) continue;
                if (c >= 5 && c <= 7) continue;
                hidden_box3.push([r, c]);
            }
        }
        regions.push({ type: '隐藏宫', index: 3, cells: hidden_box3 });

        // 隐藏宫4：第5~7行，去掉1~3列和5~7列
        const hidden_box4 = [];
        for (let r = 5; r <= 7; r++) {
            for (let c = 0; c < 9; c++) {
                if (c >= 1 && c <= 3) continue;
                if (c >= 5 && c <= 7) continue;
                hidden_box4.push([r, c]);
            }
        }
        regions.push({ type: '隐藏宫', index: 4, cells: hidden_box4 });

        // 隐藏宫5：第0、4、8行与第0、4、8列交叉的格子
        const hidden_box5 = [];
        const rows = [0, 4, 8];
        const cols = [0, 4, 8];
        for (let r of rows) {
            for (let c of cols) {
                hidden_box5.push([r, c]);
            }
        }
        regions.push({ type: '隐藏宫', index: 5, cells: hidden_box5 });
    }
    // 金字塔数独四个金字塔区域
    else if (mode === 'pyramid' && size === 9) {
        // 金字塔1：第0列的第1~5行，第1列的第2~4行，第2列的第3行
        const pyramid1 = [];
        for (let r = 1; r <= 5; r++) {
            pyramid1.push([r, 0]);
        }
        for (let r = 2; r <= 4; r++) {
            pyramid1.push([r, 1]);
        }
        pyramid1.push([3, 2]);
        regions.push({ type: '金字塔', index: 1, cells: pyramid1 });

        // 金字塔2：第0行的第3~7列，第1行的第4~6列，第2行的第5列
        const pyramid2 = [];
        for (let c = 3; c <= 7; c++) {
            pyramid2.push([0, c]);
        }
        for (let c = 4; c <= 6; c++) {
            pyramid2.push([1, c]);
        }
        pyramid2.push([2, 5]);
        regions.push({ type: '金字塔', index: 2, cells: pyramid2 });

        // 金字塔3：第8列的第3~7行，第7列的第4~6行，第6列的第5行
        const pyramid3 = [];
        for (let r = 3; r <= 7; r++) {
            pyramid3.push([r, 8]);
        }
        for (let r = 4; r <= 6; r++) {
            pyramid3.push([r, 7]);
        }
        pyramid3.push([5, 6]);
        regions.push({ type: '金字塔', index: 3, cells: pyramid3 });

        // 金字塔4：第8行的第1~5列，第7行的第2~4列，第6行的第3列
        const pyramid4 = [];
        for (let c = 1; c <= 5; c++) {
            pyramid4.push([8, c]);
        }
        for (let c = 2; c <= 4; c++) {
            pyramid4.push([7, c]);
        }
        pyramid4.push([6, 3]);
        regions.push({ type: '金字塔', index: 4, cells: pyramid4 });
    }
    else if (mode === 'isomorphic') {
        // 获取所有宫格
        const box_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
        const boxes = [];
        for (let box_row = 0; box_row < size / box_size[0]; box_row++) {
            for (let box_col = 0; box_col < size / box_size[1]; box_col++) {
                const region_cells = [];
                for (let r = box_row * box_size[0]; r < (box_row + 1) * box_size[0]; r++) {
                    for (let c = box_col * box_size[1]; c < (box_col + 1) * box_size[1]; c++) {
                        region_cells.push([r, c]);
                    }
                }
                boxes.push(region_cells);
            }
        }
        // 按宫内顺序编号，生成同位区域
        for (let pos = 0; pos < box_size[0] * box_size[1]; pos++) {
            const region_cells = [];
            for (let boxIdx = 0; boxIdx < boxes.length; boxIdx++) {
                region_cells.push(boxes[boxIdx][pos]);
            }
            regions.push({ type: '同位', index: pos + 1, cells: region_cells });
        }
    }
    // 额外区域数独：将手动标记的格子作为一个额外区域
    else if (mode === 'extra_region' && typeof get_extra_region_cells === 'function') {
        const extra_region_cells = get_extra_region_cells();
        if (Array.isArray(extra_region_cells) && extra_region_cells.length > 0) {
            // 判断是单区域还是多区域
            if (Array.isArray(extra_region_cells[0][0])) {
                // 多个区域
                extra_region_cells.forEach((region_cells, idx) => {
                    if (region_cells.length > 0) {
                        const index = region_cells
                            .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                            .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                            .join('-');
                        regions.push({ type: '额外区域', index, cells: region_cells });
                    }
                });
            } else {
                // 单个区域
                const index = extra_region_cells
                    .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                    .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                    .join('-');
                regions.push({ type: '额外区域', index, cells: extra_region_cells });
            }
        }
    }
    // 灰格连续数独：将手动标记的格子作为一个灰格连续区域
    else if (mode === 'renban' && typeof get_renban_cells === 'function') {
        const renban_cells = get_renban_cells();
        if (Array.isArray(renban_cells) && renban_cells.length > 0) {
            // 判断是单区域还是多区域
            if (Array.isArray(renban_cells[0][0])) {
                // 多个区域
                renban_cells.forEach((region_cells, idx) => {
                    if (region_cells.length > 0) {
                        const index = region_cells
                            .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                            .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                            .join('-');
                        regions.push({ type: '灰格连续区域', index, cells: region_cells });
                    }
                });
            } else {
                // 单个区域
                const index = renban_cells
                    .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                    .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                    .join('-');
                regions.push({ type: '灰格连续区域', index, cells: renban_cells });
            }
        }
    }
    // 新增：四格提示数独的圆圈区域
    else if (mode === 'quadruple') {
        const container = document.querySelector('.sudoku-container');
        let idx = 1;
        if (container) {
            const marks = container.querySelectorAll('.vx-mark');
            for (const mark of marks) {
                const left = parseInt(mark.style.left);
                const top = parseInt(mark.style.top);

                const grid = container.querySelector('.sudoku-grid');
                const grid_offset_left = grid.offsetLeft;
                const grid_offset_top = grid.offsetTop;
                const cell_width = grid.offsetWidth / size;
                const cell_height = grid.offsetHeight / size;

                const col_mark = Math.round((left - grid_offset_left + 15) / cell_width);
                const row_mark = Math.round((top - grid_offset_top + 15) / cell_height);

                // 四个相邻格子的坐标
                const positions = [
                    [row_mark - 1, col_mark - 1],
                    [row_mark - 1, col_mark],
                    [row_mark, col_mark - 1],
                    [row_mark, col_mark]
                ];

                // 只加入有效区域
                const valid_positions = positions.filter(([r, c]) =>
                    r >= 0 && r < size && c >= 0 && c < size
                );
                if (valid_positions.length === 4) {
                    // 获取圆圈内的数字
                    const input = mark.querySelector('input');
                    let nums = [];
                    if (input && input.value) {
                        nums = input.value.split('').map(Number).filter(n => !isNaN(n));
                    }
                    // 判断是否有重复
                    const has_duplicate = nums.length !== new Set(nums).size;
                    const index = valid_positions
                        .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                        .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                        .join('-');
                    regions.push({
                        type: has_duplicate ? '有重复四格提示' : '无重复四格提示',
                        index,
                        cells: valid_positions,
                        clue_nums: nums
                    });
                }
            }
        }
    }
    // 奇数模式：每个奇数标记格子都是一个“奇数”区域
    else if (mode === 'odd') {
        const odd_regions = get_odd_cells();
        let idx = 1;
        for (const region of odd_regions) {
            const index = region
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({
                type: '奇数',
                index,
                cells: region
            });
        }
    }
    // 奇偶模式：每个奇数标记格子都是一个“奇偶”区域
    else if (mode === 'odd_even') {
        const odd_even_regions = get_odd_even_cells();
        let idx = 1;
        for (const region of odd_even_regions) {
            const index = region
                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                .join('-');
            regions.push({
                type: '奇偶',
                index,
                cells: region
            });
        }
    }
    // 回文替代区域：A 取代 B，在 B 的宫/行/列中生成新区域
    else if (mode === 'palindrome') {
        const mark_lines = get_all_mark_lines();
        // 将线段展开为经过的格子，并合并首尾相接的线段
        const expanded_lines = mark_lines.map(line => get_cells_on_line(size, line[0], line[1]));
        const merged_lines = merge_connected_lines(expanded_lines);

        for (const cells of merged_lines) {
            const len = cells.length;
            for (let i = 0; i < Math.floor(len / 2); i++) {
                const A = cells[i];
                const B = cells[len - 1 - i];

                // 生成 替代宫 区域：A + (B所在宫的其他格子，不含B)
                {
                    const br = Math.floor(B[0] / box_size[0]);
                    const bc = Math.floor(B[1] / box_size[1]);
                    const cellSet = new Set();
                    for (let r = br * box_size[0]; r < (br + 1) * box_size[0]; r++) {
                        for (let c = bc * box_size[1]; c < (bc + 1) * box_size[1]; c++) {
                            if (r === B[0] && c === B[1]) continue;
                            cellSet.add(`${r},${c}`);
                        }
                    }
                    cellSet.add(`${A[0]},${A[1]}`);
                    const region_cells = Array.from(cellSet)
                        .map(s => s.split(',').map(Number));

                    const index = region_cells
                        .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                        .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                        .join('-');

                    regions.push({ type: '回文替代宫', index, cells: region_cells });
                }

                // 生成 替代行 区域：A + (B所在行的其他格子，不含B)
                {
                    const cellSet = new Set();
                    for (let c = 0; c < size; c++) {
                        if (c === B[1]) continue;
                        cellSet.add(`${B[0]},${c}`);
                    }
                    cellSet.add(`${A[0]},${A[1]}`);
                    const region_cells = Array.from(cellSet)
                        .map(s => s.split(',').map(Number));

                    const index = region_cells
                        .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                        .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                        .join('-');

                    regions.push({ type: '回文替代行', index, cells: region_cells });
                }

                // 生成 替代列 区域：A + (B所在列的其他格子，不含B)
                {
                    const cellSet = new Set();
                    for (let r = 0; r < size; r++) {
                        if (r === B[0]) continue;
                        cellSet.add(`${r},${B[1]}`);
                    }
                    cellSet.add(`${A[0]},${A[1]}`);
                    const region_cells = Array.from(cellSet)
                        .map(s => s.split(',').map(Number));

                    const index = region_cells
                        .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                        .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                        .join('-');

                    regions.push({ type: '回文替代列', index, cells: region_cells });
                }
            }
        }
    }

    // 计算完成后缓存结果
    _regions_cache = regions;
    _regions_cache_size = size;
    _regions_cache_mode = mode;
    return regions;
}

// 获取所有特定组合
export function get_special_combination_regions(board, size, mode = 'classic') {
    // 检查缓存是否有效
    // if (state.current_mode === 'X_sums' || state.current_mode === 'sandwich' || state.current_mode === 'skyscraper') {
    if (state.current_mode === 'skyscraper') {
    } else {
        if (
            _special_regions_cache &&
            _special_regions_cache_size === size &&
            _special_regions_cache_mode === mode
            // _special_regions_cache_mark_count === current_mark_count
        ) {
            return _special_regions_cache;
        }
    }
    const regions = [];
    switch (mode) {
        case 'fortress': {
            const fortressCells = Array.from(state.fortress_cells).map(key => key.split(',').map(Number));
            const directions = [
                [-1, 0], // 上
                [1, 0],  // 下
                [0, -1], // 左
                [0, 1],  // 右
            ];

            for (const [row, col] of fortressCells) {
                const region = [[row, col]]; // 包含灰格本身

                for (const [dr, dc] of directions) {
                    const neighborRow = row + dr;
                    const neighborCol = col + dc;

                    // 检查是否在边界内且是白格
                    if (
                        neighborRow >= 0 && neighborRow < size &&
                        neighborCol >= 0 && neighborCol < size &&
                        !state.fortress_cells.has(`${neighborRow},${neighborCol}`)
                    ) {
                        region.push([neighborRow, neighborCol]);
                    }
                }
                // clue_nums 包含与格子数量相同的 1-size 数字集合
                const clue_nums = [];
                for (let i = 0; i < region.length; i++) {
                    clue_nums.push(...Array.from({ length: size }, (_, idx) => idx + 1));
                }
                // 生成区域的 index
                const index = region
                    .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                    .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                    .join('-');

                // 将灰格及其邻居作为一个特定组合区域
                regions.push({
                    type: '特定组合',
                    index,
                    cells: region,
                    // clue_nums, // 可根据需求填充线索数字
                });
            }
            break;
        }
        case 'clone': {
            const clone_regions = get_clone_cells();
            if (Array.isArray(clone_regions) && clone_regions.length > 0) {
                // 遍历所有克隆区域对
                for (let i = 0; i < clone_regions.length; i++) {
                    for (let j = i + 1; j < clone_regions.length; j++) {
                        const region_i = clone_regions[i];
                        const region_j = clone_regions[j];

                        // // 必须形状一致（格子数相同）
                        // if (region_i.length !== region_j.length) {
                        //     continue;
                        // }

                        // 必须形状一致（相对坐标相同）
                        if (!are_regions_same_shape(region_i, region_j)) {
                            continue;
                        }

                        // 将两个区域按坐标排序，建立对应关系
                        const sorted_i = [...region_i].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
                        const sorted_j = [...region_j].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

                        // 为每对对应的格子创建特定组合区域
                        for (let k = 0; k < sorted_i.length; k++) {
                            const cell_i = sorted_i[k];
                            const cell_j = sorted_j[k];

                            // 创建包含对应位置两个格子的特定组合
                            const cells = [cell_i, cell_j];
                            const index = cells
                                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                                .join('-');

                            regions.push({
                                type: '特定组合',
                                index,
                                cells: cells,
                                // clue_nums: Array.from({ length: size }, (_, n) => n + 1)
                                clue_nums: Array.from({length: size * cells.length}, (_, n) => (n % size) + 1)
                            });
                        }
                    }
                }
            }
            break;
        }
        case 'quadruple': {
            const container = document.querySelector('.sudoku-container');
            if (container) {
                const marks = container.querySelectorAll('.vx-mark');
                let region_index = 1;
                for (const mark of marks) {
                    const left = parseInt(mark.style.left);
                    const top = parseInt(mark.style.top);

                    const grid = container.querySelector('.sudoku-grid');
                    const grid_offset_left = grid.offsetLeft;
                    const grid_offset_top = grid.offsetTop;
                    const cell_width = grid.offsetWidth / size;
                    const cell_height = grid.offsetHeight / size;

                    const col_mark = Math.round((left - grid_offset_left + 15) / cell_width);
                    const row_mark = Math.round((top - grid_offset_top + 15) / cell_height);

                    // 四个相邻格子的坐标
                    const positions = [
                        [row_mark - 1, col_mark - 1],
                        [row_mark - 1, col_mark],
                        [row_mark, col_mark - 1],
                        [row_mark, col_mark]
                    ];

                    // 只加入有效区域
                    const valid_positions = positions.filter(([r, c]) =>
                        r >= 0 && r < size && c >= 0 && c < size
                    );
                    if (valid_positions.length === 4) {
                        // 获取圆圈内的数字
                        const input = mark.querySelector('input');
                        let nums = [];
                        if (input && input.value) {
                            nums = input.value.split('').map(Number).filter(n => !isNaN(n));
                        }
                        // 判断是否有重复
                        const has_duplicate = nums.length !== new Set(nums).size;
                        // 生成区域的 index
                        const index = valid_positions
                            .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                            .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                            .join('-');
                        if (has_duplicate) {
                            regions.push({
                                type: '特定组合',
                                index,
                                cells: valid_positions,
                                // clue_nums: nums
                            });
                        }
                    }
                }
            }
            break;
        }
        case 'add': {
            const container = document.querySelector('.sudoku-container');
            if (!container) return regions;
            const marks = container.querySelectorAll('.vx-mark');
            let region_index = 1;
            for (const mark of marks) {
                const input = mark.querySelector('input');
                const value = input && input.value.trim();
                // 只处理有效的和数字
                const sum = parseInt(value, 10);
                if (isNaN(sum) || sum <= 0) continue;

                // 解析标记的唯一key（v-/h- 表示两格；无 key 表示交点四格）
                const key = mark.dataset.key;

                // ----- 两格提示（竖/横线） -----
                if (key && (key.startsWith('v-') || key.startsWith('h-'))) {
                    let cell_a, cell_b;
                    if (key.startsWith('v-')) {
                        const [_, row_str, col_str] = key.split('-');
                        const r = parseInt(row_str, 10);
                        const c = parseInt(col_str, 10);
                        cell_a = [r, c - 1];
                        cell_b = [r, c];
                    } else {
                        const [_, row_str, col_str] = key.split('-');
                        const r = parseInt(row_str, 10);
                        const c = parseInt(col_str, 10);
                        cell_a = [r - 1, c];
                        cell_b = [r, c];
                    }

                    if (
                        !cell_a || !cell_b ||
                        cell_a.some(n => !Number.isInteger(n)) ||
                        cell_b.some(n => !Number.isInteger(n)) ||
                        cell_a[0] < 0 || cell_a[0] >= size || cell_a[1] < 0 || cell_a[1] >= size ||
                        cell_b[0] < 0 || cell_b[0] >= size || cell_b[1] < 0 || cell_b[1] >= size
                    ) continue;

                    const clue_nums_set = new Set();
                    for (let a = 1; a <= size; a++) {
                        for (let b = 1; b <= size; b++) {
                            if (a + b === sum) {
                                clue_nums_set.add(a);
                                clue_nums_set.add(b);
                            }
                        }
                    }
                    const clue_nums = Array.from(clue_nums_set).sort((x, y) => x - y);

                    // 生成区域的 index
                    const index = [cell_a, cell_b]
                        .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                        .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                        .join('-');

                    regions.push({
                        type: '特定组合',
                        index,
                        cells: [cell_a, cell_b],
                        // clue_nums
                    });
                    continue;
                }

                // ----- 四格交点提示 -----
                let row_mark, col_mark;
                if (key && key.startsWith('x-')) {
                    const [_, row_str, col_str] = key.split('-');
                    row_mark = parseInt(row_str, 10);
                    col_mark = parseInt(col_str, 10);
                    if (!Number.isInteger(row_mark) || !Number.isInteger(col_mark)) continue;
                } else {
                    if (!grid) continue;
                    const grid_offset_left = grid.offsetLeft;
                    const grid_offset_top = grid.offsetTop;
                    const cell_width = grid.offsetWidth / size;
                    const cell_height = grid.offsetHeight / size;

                    const left = parseInt(mark.style.left, 10);
                    const top = parseInt(mark.style.top, 10);
                    if (isNaN(left) || isNaN(top)) continue;

                    row_mark = Math.round((top - grid_offset_top + 15) / cell_height);
                    col_mark = Math.round((left - grid_offset_left + 15) / cell_width);
                }

                const cells = [
                    [row_mark - 1, col_mark - 1],
                    [row_mark - 1, col_mark],
                    [row_mark, col_mark - 1],
                    [row_mark, col_mark]
                ].filter(([r, c]) => r >= 0 && r < size && c >= 0 && c < size);

                // 只有完整四格才作为四格提示处理
                if (cells.length !== 4) continue;

                // 计算所有满足四数和为 sum 的组合（允许数字相同，但任一数字在组合中最多出现两次）
                // 枚举非递减四元组 a <= b <= c <= d，统计每个数字在任一合法组合中的最大出现次数（0/1/2）
                const maxCount = new Array(size + 1).fill(0); // 下标 1..size
                let foundCombo = false;

                for (let n = 1; n <= size; n++) {
                    // 该数字出现2次：剩余两数和为 remain2 = sum - 2n
                    const remain2 = sum - 2 * n;
                    if (remain2 >= 2 && remain2 <= 2 * size) {
                        // 检查是否存在两个数 a, b (1 <= a, b <= size) 使得 a + b = remain2
                        // 条件：remain2 <= 2*size 且 remain2 >= 2
                        // 简化：只要 2 <= remain2 <= 2*size 就一定有解
                        foundCombo = true;
                        maxCount[n] = 2;
                        continue;
                    }
                    
                    // 该数字出现1次：剩余三数和为 remain1 = sum - n
                    const remain1 = sum - n;
                    if (remain1 >= 3 && remain1 <= 3 * size) {
                        // 检查是否存在三个数 a, b, c (1 <= a,b,c <= size) 使得 a+b+c = remain1
                        // 可以允许重复，所以条件简化为：3 <= remain1 <= 3*size
                        foundCombo = true;
                        maxCount[n] = Math.max(maxCount[n], 1);
                        continue;
                    }
                    
                    // 该数字出现0次：四数和为 sum，且都不等于 n
                    // 最小和：4个1（或4个最小可用数）
                    // 最大和：4个size（或4个最大可用数）
                    const minSum = (n === 1) ? 8 : 4; // 如果排除1，最小和是4*2=8
                    const maxSum = (n === size) ? 4 * (size - 1) : 4 * size;
                    if (sum >= minSum && sum <= maxSum) {
                        foundCombo = true;
                        maxCount[n] = Math.max(maxCount[n], 0);
                    }
                }

                if (!foundCombo) continue; // 没有合法四元组合则跳过

                // 构造 clue_nums：按数字从小到大，把每个数字重复 maxCount 次（0/1/2）
                const clue_nums = [];
                for (let n = 1; n <= size; n++) {
                    for (let t = 0; t < maxCount[n]; t++) {
                        clue_nums.push(n);
                    }
                }
                if (clue_nums.length === 0) continue;

                const index = cells
                    .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                    .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                    .join('-');

                regions.push({
                    type: '特定组合',
                    index,
                    cells,
                    // clue_nums
                });
            }
            break;
        }
        case 'product': {
            const container = document.querySelector('.sudoku-container');
            if (!container) return regions;
            const marks = container.querySelectorAll('.vx-mark');
            let region_index = 1;
            for (const mark of marks) {
                const input = mark.querySelector('input');
                const value = input && input.value.trim();
                // 只处理有效的乘积数字
                const product = parseInt(value, 10);
                if (isNaN(product) || product <= 0) continue;

                // 解析标记的唯一key
                const key = mark.dataset.key;
                if (!key) continue;

                // 解析标记对应的两格
                // 竖线：v-row-col，横线：h-row-col
                let cell_a, cell_b;
                if (key.startsWith('v-')) {
                    // 竖线，row、col
                    const [_, row_str, col_str] = key.split('-');
                    const r = parseInt(row_str);
                    const c = parseInt(col_str);
                    cell_a = [r, c - 1];
                    cell_b = [r, c];
                } else if (key.startsWith('h-')) {
                    // 横线，row、col
                    const [_, row_str, col_str] = key.split('-');
                    const r = parseInt(row_str);
                    const c = parseInt(col_str);
                    cell_a = [r - 1, c];
                    cell_b = [r, c];
                } else {
                    continue;
                }

                // 计算所有满足乘积的数字组合
                const clue_nums_set = new Set();
                for (let a = 1; a <= size; a++) {
                    for (let b = 1; b <= size; b++) {
                        if (a * b === product) {
                            clue_nums_set.add(a);
                            clue_nums_set.add(b);
                        }
                    }
                }
                const clue_nums = Array.from(clue_nums_set).sort((x, y) => x - y);

                // 生成区域的 index
                const index = [cell_a, cell_b]
                    .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                    .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                    .join('-');

                regions.push({
                    type: '特定组合',
                    index,
                    cells: [cell_a, cell_b],
                    // clue_nums: clue_nums
                });
            }
            break;
        }
        case 'ratio': {
            const container = document.querySelector('.sudoku-container');
            if (!container) return regions;
            const marks = container.querySelectorAll('.vx-mark');
            let region_index = 1;
            for (const mark of marks) {
                const input = mark.querySelector('input');
                const value = input && input.value.trim();
                // 只处理形如 "a/b" 的比例
                if (!value || !/^(\d*)\/(\d*)$/.test(value)) continue;
                const match = value.match(/^(\d*)\/(\d*)$/);
                const left_num = match[1] ? parseInt(match[1]) : null;
                const right_num = match[2] ? parseInt(match[2]) : null;
                if (!left_num && !right_num) continue;
                // 解析标记的唯一key
                const key = mark.dataset.key;
                if (!key) continue;
                // 解析标记对应的两格
                // 竖线：v-row-col，横线：h-row-col
                let cell_a, cell_b;
                if (key.startsWith('v-')) {
                    // 竖线，row、col
                    const [_, row_str, col_str] = key.split('-');
                    const r = parseInt(row_str);
                    const c = parseInt(col_str);
                    cell_a = [r, c - 1];
                    cell_b = [r, c];
                } else if (key.startsWith('h-')) {
                    // 横线，row、col
                    const [_, row_str, col_str] = key.split('-');
                    const r = parseInt(row_str);
                    const c = parseInt(col_str);
                    cell_a = [r - 1, c];
                    cell_b = [r, c];
                } else {
                    continue;
                }

                // 计算所有满足比例的数字组合
                const clue_nums_set = new Set();
                for (let a = 1; a <= size; a++) {
                    for (let b = 1; b <= size; b++) {
                        if (
                            (a * right_num === b * left_num) ||
                            (b * right_num === a * left_num)
                        ) {
                            clue_nums_set.add(a);
                            clue_nums_set.add(b);
                        }
                    }
                }
                const clue_nums = Array.from(clue_nums_set).sort((x, y) => x - y);

                const index = [cell_a, cell_b]
                    .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                    .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                    .join('-');

                regions.push({
                    type: '特定组合',
                    index,
                    cells: [cell_a, cell_b],
                    // clue_nums: clue_nums
                });
            }
            break;
        }
        case 'inequality': {
            const container = document.querySelector('.sudoku-container');
            if (container) {
                const marks = container.querySelectorAll('.vx-mark');
                for (const mark of marks) {
                    const key = mark.dataset.key;
                    if (!key) continue;

                    let cell_a, cell_b;
                    if (key.startsWith('v-')) {
                        const [_, row_str, col_str] = key.split('-');
                        const r = parseInt(row_str);
                        const c = parseInt(col_str);
                        cell_a = [r, c - 1];
                        cell_b = [r, c];
                    } else if (key.startsWith('h-')) {
                        const [_, row_str, col_str] = key.split('-');
                        const r = parseInt(row_str);
                        const c = parseInt(col_str);
                        cell_a = [r - 1, c];
                        cell_b = [r, c];
                    } else {
                        continue;
                    }

                    if (cell_a[0] >= 0 && cell_a[0] < size && cell_a[1] >= 0 && cell_a[1] < size &&
                        cell_b[0] >= 0 && cell_b[0] < size && cell_b[1] >= 0 && cell_b[1] < size) {
                        
                        // const index = `${getRowLetter(cell_a[0] + 1)}${cell_a[1] + 1}-${getRowLetter(cell_b[0] + 1)}${cell_b[1] + 1}`;
                        const index = [cell_a, cell_b]
                            .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                            .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                            .join('-');
                        regions.push({
                            type: '特定组合',
                            index,
                            cells: [cell_a, cell_b],
                            // clue_nums: Array.from({ length: size }, (_, n) => n + 1)
                        });
                    }
                }
            }
            break;
        }
        case 'kropki': {
            const container = document.querySelector('.sudoku-container');
            if (!container) return regions;
            const marks = container.querySelectorAll('.vx-mark[data-key]');
            let region_index = 1;

            const parsePairFromKey = (key) => {
                if (!key) return null;
                if (key.startsWith('v-')) {
                    const [, rowStr, colStr] = key.split('-');
                    const row = Number.parseInt(rowStr, 10);
                    const col = Number.parseInt(colStr, 10) - 1;
                    if (Number.isNaN(row) || Number.isNaN(col)) return null;
                    return { row1: row, col1: col, row2: row, col2: col + 1 };
                }
                if (key.startsWith('h-')) {
                    const [, rowStr, colStr] = key.split('-');
                    const row = Number.parseInt(rowStr, 10) - 1;
                    const col = Number.parseInt(colStr, 10);
                    if (Number.isNaN(row) || Number.isNaN(col)) return null;
                    return { row1: row, col1: col, row2: row + 1, col2: col };
                }
                return null;
            };

            const readKropkiType = (mark) => {
                const raw = (mark.dataset.kropkiType || mark.querySelector('input')?.value || '').trim().toUpperCase();
                return raw === 'B' || raw === 'W' ? raw : null;
            };

            for (const mark of marks) {
                const key = mark.dataset.key;
                const pair = parsePairFromKey(key);
                const type = readKropkiType(mark);
                if (!pair || !type) continue;

                const clueNumsSet = new Set();
                if (type === 'B') {
                    for (let a = 1; a <= size; a++) {
                        const doubled = a * 2;
                        if (doubled >= 1 && doubled <= size) {
                            clueNumsSet.add(a);
                            clueNumsSet.add(doubled);
                        }
                        const halved = a / 2;
                        if (Number.isInteger(halved) && halved >= 1 && halved <= size) {
                            clueNumsSet.add(a);
                            clueNumsSet.add(halved);
                        }
                    }
                } else {
                    for (let a = 1; a <= size; a++) {
                        const neighbors = [a - 1, a + 1];
                        for (const b of neighbors) {
                            if (b >= 1 && b <= size) {
                                clueNumsSet.add(a);
                                clueNumsSet.add(b);
                            }
                        }
                    }
                }

                const clue_nums = Array.from(clueNumsSet).sort((x, y) => x - y);
                if (clue_nums.length === 0) continue;

                const index = [
                    [pair.row1, pair.col1],
                    [pair.row2, pair.col2],
                ]
                    .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                    .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                    .join('-');

                regions.push({
                    type: '特定组合',
                    index,
                    cells: [
                        [pair.row1, pair.col1],
                        [pair.row2, pair.col2],
                    ],
                    // clue_nums,
                });
            }
            break;
        }
        case 'VX':
        case 'vx': {
            const container = document.querySelector('.sudoku-container');
            if (!container) return regions;
            const marks = container.querySelectorAll('.vx-mark[data-key]');
            let region_index = 1;
            for (const mark of marks) {
                const key = mark.dataset.key;
                if (!key) continue;

                // 解析两格坐标（与 product/ratio 保持一致的 key 规则）
                let cell_a, cell_b;
                if (key.startsWith('v-')) {
                    const [, row_str, col_str] = key.split('-');
                    const r = parseInt(row_str, 10);
                    const c = parseInt(col_str, 10);
                    if (Number.isNaN(r) || Number.isNaN(c)) continue;
                    cell_a = [r, c - 1];
                    cell_b = [r, c];
                } else if (key.startsWith('h-')) {
                    const [, row_str, col_str] = key.split('-');
                    const r = parseInt(row_str, 10);
                    const c = parseInt(col_str, 10);
                    if (Number.isNaN(r) || Number.isNaN(c)) continue;
                    cell_a = [r - 1, c];
                    cell_b = [r, c];
                } else {
                    continue;
                }

                // 读取标记类型 V / X（优先 dataset，回退到输入框文本）
                const rawType = (mark.dataset.vxType || mark.querySelector('input')?.value || '').toUpperCase();
                const type = (rawType === 'V' || rawType === 'X') ? rawType : null;
                if (!type) continue;
                const requiredSum = type === 'V' ? 5 : 10;

                // 计算所有可能出现在这两个格子中的数字（1..size 中与另一数能和为 requiredSum 的数）
                const clue_nums_set = new Set();
                for (let a = 1; a <= size; a++) {
                    for (let b = 1; b <= size; b++) {
                        if (a + b === requiredSum) {
                            clue_nums_set.add(a);
                            clue_nums_set.add(b);
                        }
                    }
                }
                const clue_nums = Array.from(clue_nums_set).sort((x, y) => x - y);
                if (clue_nums.length === 0) continue;

                const index = [cell_a, cell_b]
                    .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                    .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                    .join('-');

                regions.push({
                    type: '特定组合',
                    index,
                    cells: [cell_a, cell_b],
                    // clue_nums
                });
            }
            break;
        }
        case 'palindrome': {
            const mark_lines = get_all_mark_lines();
            // 合并首尾相接的线段
            // 先把每条线段扩展为经过的所有格子
            const size = state.current_grid_size || size;
            const expanded_lines = mark_lines.map(line => get_cells_on_line(size, line[0], line[1]));
            // 合并线段
            const merged_lines = merge_connected_lines(expanded_lines);
            let regionIndex = 1;
            for (const cells of merged_lines) {
                const len = cells.length;
                for (let i = 0; i < Math.floor(len / 2); i++) {
                    const cell_a = cells[i];
                    const cell_b = cells[len - 1 - i];

                    const index = [cell_a, cell_b]
                        .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                        .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                        .join('-');
                    regions.push({
                        type: '特定组合',
                        index,
                        cells: [cell_a, cell_b],
                        // clue_nums: Array.from({length: size * 2}, (_, n) => (n % size) + 1)
                    });
                }
            }
            // log_process(`合并后的回文线段数：${regions.length}`);、
            break;
        }
        case 'consecutive': {
            // 处理连续数独的白点标记
            const container = document.querySelector('.sudoku-container');
            if (container) {
                container.querySelectorAll('.vx-mark[data-key]').forEach(mark => {
                    const key = mark.dataset.key;
                    const type = (mark.dataset.consecutiveType || '').toUpperCase();
                    if (type !== 'W') return; // 只处理白点标记

                    const parts = key.split('-');
                    if (parts.length < 3) return;

                    const rowToken = Number(parts[1]);
                    const colToken = Number(parts[2]);
                    if (Number.isNaN(rowToken) || Number.isNaN(colToken)) return;

                    let pair = null;
                    if (key.startsWith('v-')) {
                        pair = { row1: rowToken, col1: colToken - 1, row2: rowToken, col2: colToken };
                    } else if (key.startsWith('h-')) {
                        pair = { row1: rowToken - 1, col1: colToken, row2: rowToken, col2: colToken };
                    }

                    if (pair) {
                        regions.push({
                            type: '连续数独白点',
                            index: `${pair.row1},${pair.col1}-${pair.row2},${pair.col2}`,
                            cells: [
                                [pair.row1, pair.col1],
                                [pair.row2, pair.col2]
                            ]
                        });
                    }
                });
            }
            break;
        }
        case 'renban': {
            if (typeof get_renban_cells === 'function') {
                const renban_cells = get_renban_cells();
                if (Array.isArray(renban_cells) && renban_cells.length > 0) {
                    // 判断是单区域还是多区域
                    if (Array.isArray(renban_cells[0][0])) {
                        // 多个区域
                        renban_cells.forEach((region_cells) => {
                            const index = region_cells
                                .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                                .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                                .join('-');

                            if (region_cells.length > 0) {
                                regions.push({ type: '特定组合', index, cells: region_cells, });
                            }
                        });
                    } else {
                        // 单个区域
                        const index = renban_cells
                            .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                            .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                            .join('-');
                        regions.push({ type: '特定组合', index, cells: renban_cells, });
                    }
                }
            }
            break;
        }
        case 'skyscraper': {
            const clues = state.clues_board;
            const hasCluesBoard = Array.isArray(clues) && clues.length === size + 2;
        
            const parse_clue = (r, c) => {
                if (hasCluesBoard) {
                    const v = clues[r]?.[c];
                    return (typeof v === 'number' && v > 0) ? v : 0;
                }
                const container = document.querySelector('.sudoku-container');
                if (!container) return 0;
                const input = container.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
                const v = parseInt(input?.value ?? '', 10);
                return Number.isFinite(v) && v > 0 ? v : 0;
            };
            // log_process(
            //     board
            //         .map(row => row.map(cell => Array.isArray(cell) ? `[${cell.join(',')}]` : cell).join(' '))
            //         .join('\n')
            // );
            // 行方向处理
            for (let row = 1; row <= size; row++) {
                const left_clue = parse_clue(row, 0);
                const right_clue = parse_clue(row, size + 1);

                // 从左到右寻找 size 的位置（并考虑候选影响）
                const find_size_left = () => {
                    if (!board || !Array.isArray(board[row - 1])) return -1;
                    const array = [];
                    let current_index = size;
                    let current_target = size;
                    let compare_index = 0;
                    let delta = 0;
                    for (let target = size; target >= 1; target--) {
                        let found_index = -1;
                        // 在整行查找 target
                        for (let c = 0; c < size; c++) {
                            if (board[row - 1][c] === target) {
                                if (target < current_target) {
                                    for (let t = target + 1; t <= current_target; t++) {
                                        for (let i = c; i < current_index; i++) {
                                            if (Array.isArray(board[row - 1][i]) && board[row - 1][i].includes(t)) {
                                                delta++;
                                                break;
                                            }
                                        }
                                    }
                                    if (delta > 1) {
                                        // log_process(`row ${row} target ${target} found at index ${c}, delta=${delta},current_index=${current_index},current_target=${current_target}`);
                                        let found = false;
                                        for (let t = current_target; t >= target + 1 && !found; t--) {
                                            // log_process(`  checking candidate ${t}`);
                                            for (let i = current_index - 1; i >= c; i--) {
                                                // log_process(`    checking index ${i}`);
                                                if (Array.isArray(board[row - 1][i]) && board[row - 1][i].includes(t)) {
                                                    // log_process(`row ${row} target ${target} found candidate ${t} at index ${i}, delta=${delta}`);
                                                    for (let j = c + 1; j <= i; j++) array.push(j);
                                                    found = true; 
                                                    break;
                                                }
                                            }
                                        }
                                    } else if (delta === 1) {
                                        for (let t = target + 1; t <= current_target; t++) {
                                            for (let i = c; i < current_index; i++) {
                                                if (Array.isArray(board[row - 1][i]) && board[row - 1][i].includes(t)) {
                                                    for (let i = 0; i < size; i++) {
                                                        if (i >= c && i < current_index) continue;
                                                        if (Array.isArray(board[row - 1][i]) && board[row - 1][i].includes(t)) {
                                                            for (let i = c + 1; i < current_index; i++) array.push(i);
                                                            break;
                                                        }
                                                    }
                                                    // for (let i = current_index; i < size; i++) {
                                                    //     if (Array.isArray(board[row - 1][i]) && board[row - 1][i].includes(t)) {
                                                    //         for (let i = c + 1; i < current_index; i++) array.push(i);
                                                    //         break;
                                                    //     }
                                                    // }
                                                    break;
                                                }
                                            }
                                        }
                                    } else {
                                        // delta === 0
                                        // for (let i = c + 1; i < current_index; i++) array.push(i);
                                    }
                                }
                                delta = 0;
                                found_index = c;
                                compare_index = 0;
                                
                                break;
                            }
                        }
                        if (found_index === -1) {
                            // 没找到，检查 current_index 左侧未确定格子的候选数
                            for (let c = size; c >= 0; c--) {
                                if (Array.isArray(board[row - 1][c]) && board[row - 1][c].includes(target)) {
                                    if (compare_index === 0) {
                                        if (current_index > c) {
                                            current_index = c+1;
                                        }
                                    }
                                    compare_index++;
                                    // delta++;
                                    // for (let c = current_index; c < size; c++) {
                                    //     if (Array.isArray(board[row - 1][c]) && board[row - 1][c].includes(target)) {
                                    //         delta++;
                                    //     }
                                    // }
                                    break;
                                }
                            }
                            continue;
                        }
                        if (current_index === -1 || found_index < current_index) {
                            current_index = found_index;
                        }
                    }
                    // return current_index === -1 ? [] : Array.from({ length: current_index }, (_, k) => k);
                    for (let c = 0; c < current_index; c++) array.push(c);
                    array.sort((a, b) => a - b);
                    return array;
                };
                // 从右到左寻找 size 的位置（并考虑候选影响），镜像自 find_size_left
                const find_size_right = () => {
                    if (!board || !Array.isArray(board[row - 1])) return -1;
                    const array = [];
                    let current_index = -1;
                    let current_target = size;
                    let compare_index = 0;
                    let delta = 0;
                
                    for (let target = size; target >= 1; target--) {
                        let found_index = -1;
                
                        // 在整行查找 target（从右到左）
                        for (let c = size - 1; c >= 0; c--) {
                            if (board[row - 1][c] === target) {
                                if (target < current_target) {
                                    // 统计区间 (current_index, c] 上候选 t 的存在情况
                                    for (let t = target + 1; t <= current_target; t++) {
                                        for (let i = c; i > current_index; i--) {
                                            if (Array.isArray(board[row - 1][i]) && board[row - 1][i].includes(t)) {
                                                delta++;
                                                break;
                                            }
                                        }
                                    }
                
                                    if (delta > 1) {
                                        // 在 (current_index, c] 中从左到右找一个候选 t 的位置 i
                                        let found = false;
                                        for (let t = current_target; t >= target + 1 && !found; t--) {
                                            for (let i = current_index + 1; i <= c; i++) {
                                                if (Array.isArray(board[row - 1][i]) && board[row - 1][i].includes(t)) {
                                                    // 将 [i, c) 的索引推入（右侧需要标注的格）
                                                    for (let j = i; j <= c - 1; j++) array.push(j);
                                                    found = true;
                                                    break;
                                                }
                                            }
                                        }
                                    } else if (delta === 1) {
                                        // 若候选 t 在该区间仅出现一次，但在其他位置也出现，则整段 (current_index, c) 都需要标注
                                        for (let t = target + 1; t <= current_target; t++) {
                                            for (let i = c; i > current_index; i--) {
                                                if (Array.isArray(board[row - 1][i]) && board[row - 1][i].includes(t)) {
                                                    // 检查区间外是否也存在候选 t
                                                    for (let k = 0; k < size; k++) {
                                                        if (k > current_index && k <= c) continue;
                                                        if (Array.isArray(board[row - 1][k]) && board[row - 1][k].includes(t)) {
                                                            for (let j = current_index + 1; j < c; j++) array.push(j);
                                                            break;
                                                        }
                                                    }
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                                delta = 0;
                                found_index = c;
                                compare_index = 0;
                                break;
                            }
                        }
                
                        if (found_index === -1) {
                            // 没找到，检查 current_index 右侧未确定格子的候选数
                            for (let c = 0; c < size; c++) {
                                if (Array.isArray(board[row - 1][c]) && board[row - 1][c].includes(target)) {
                                    if (compare_index === 0) {
                                        if (current_index < c - 1) {
                                            current_index = c - 1;
                                        }
                                    }
                                    compare_index++;
                                    break;
                                }
                            }
                            continue;
                        }
                
                        if (current_index === -1 || found_index > current_index) {
                            current_index = found_index;
                            // 与左侧实现一致保持 current_target = size，不下调也可
                            // 如需严格镜像，可设置：current_target = target;
                        }
                    }
                
                    // 收集从 current_index 右侧（不含 current_index）的所有索引
                    for (let c = current_index + 1; c < size; c++) array.push(c);
                    array.sort((a, b) => a - b);
                    return array;
                };
                const pos_left = find_size_left();
                const pos_right = find_size_right();
        
                if (left_clue > 0) {
                    if (left_clue === 1) {
                        const cell = [row - 1, 0];
                        const index = `${getRowLetter(row)}1`;
                        regions.push({ type: '特定组合', index, cells: [cell] });
                        // log_process(`行 ${row} 左侧线索为 1，添加特定组合区域 ${index}`);
                    } else if (left_clue === size) {
                        for (let col = 1; col <= size; col++) {
                            const cell = [row - 1, col - 1];
                            const index = `${getRowLetter(row)}${col}`;
                            regions.push({ type: '特定组合', index, cells: [cell] });
                            // log_process(`行 ${row} 左侧线索为 ${size}，添加特定组合区域 ${index}`);
                        }
                    } else {
                        if (pos_left && Array.isArray(pos_left) && pos_left.length > 0) {
                            // log_process(pos);
                            // 从外侧（左）最近的第一格 col=1 (index 0) 到包含 size 的格子 pos
                            const cells = [];
                            // for (let c = 0; c < pos_left; c++) cells.push([row - 1, c]);
                            for (let c of pos_left) cells.push([row - 1, c]);
                            const index = cells.map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`).join('-');
                            regions.push({ type: '特定组合', index, cells });
                            // log_process(`行 ${row} 左侧线索为 ${left_clue}，添加特定组合区域 ${index}`);
                        }
                    }
                }
        
                if (right_clue > 0) {
                    if (right_clue === 1) {
                        const cell = [row - 1, size - 1];
                        const index = `${getRowLetter(row)}${size}`;
                        regions.push({ type: '特定组合', index, cells: [cell] });
                    } else if (right_clue === size) {
                        for (let col = 1; col <= size; col++) {
                            const cell = [row - 1, col - 1];
                            const index = `${getRowLetter(row)}${col}`;
                            regions.push({ type: '特定组合', index, cells: [cell] });
                        }
                    } else {
                        if (pos_right && Array.isArray(pos_right) && pos_right.length > 0) {
                            // 从外侧（右）最近的第一格 col=size (index size-1) 向左到包含 size 的格子 pos
                            const cells = [];
                            // for (let c = size - 1; c > pos_right; c--) cells.push([row - 1, c]);
                            for (let c of pos_right) cells.push([row - 1, c]);
                            // for (let c of pos_right) log_process(`row ${row} right pos includes col index ${c}`);
                            const index = cells.map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`).join('-');
                            regions.push({ type: '特定组合', index, cells });
                            // log_process(`行 ${row} 右侧线索为 ${right_clue}，添加特定组合区域 ${index}`);
                        }
                    }
                }
            }

            // 列方向处理（同理）
            for (let col = 1; col <= size; col++) {
                const top_clue = parse_clue(0, col);
                const bottom_clue = parse_clue(size + 1, col);
                // 从上到下寻找 size 的位置（并考虑候选影响），镜像自 find_size_left
                const find_size_top = () => {
                    if (!board || !Array.isArray(board[0])) return -1;
                    const array = [];
                    let current_index = size;
                    let current_target = size;
                    let compare_index = 0;
                    let delta = 0;
                
                    for (let target = size; target >= 1; target--) {
                        let found_index = -1;
                
                        // 在整列查找 target（从上到下）
                        for (let r = 0; r < size; r++) {
                            if (board[r][col - 1] === target) {
                                if (target < current_target) {
                                    for (let t = target + 1; t <= current_target; t++) {
                                        for (let i = r; i < current_index; i++) {
                                            if (Array.isArray(board[i][col - 1]) && board[i][col - 1].includes(t)) {
                                                delta++;
                                                break;
                                            }
                                        }
                                    }
                                    if (delta > 1) {
                                        let found = false;
                                        for (let t = current_target; t >= target + 1 && !found; t--) {
                                            for (let i = current_index - 1; i >= r; i--) {
                                                if (Array.isArray(board[i][col - 1]) && board[i][col - 1].includes(t)) {
                                                    for (let j = r + 1; j <= i; j++) array.push(j);
                                                    found = true;
                                                    break;
                                                }
                                            }
                                        }
                                    } else if (delta === 1) {
                                        for (let t = target + 1; t <= current_target; t++) {
                                            for (let i = r; i < current_index; i++) {
                                                if (Array.isArray(board[i][col - 1]) && board[i][col - 1].includes(t)) {
                                                    for (let k = 0; k < size; k++) {
                                                        if (k >= r && k < current_index) continue;
                                                        if (Array.isArray(board[k][col - 1]) && board[k][col - 1].includes(t)) {
                                                            for (let j = r + 1; j < current_index; j++) array.push(j);
                                                            break;
                                                        }
                                                    }
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                                delta = 0;
                                found_index = r;
                                compare_index = 0;
                                break;
                            }
                        }
                
                        if (found_index === -1) {
                            // 没找到，检查 current_index 上侧未确定格子的候选数
                            for (let rr = size - 1; rr >= 0; rr--) {
                                if (Array.isArray(board[rr][col - 1]) && board[rr][col - 1].includes(target)) {
                                    if (compare_index === 0) {
                                        if (current_index > rr) {
                                            current_index = rr + 1;
                                        }
                                    }
                                    compare_index++;
                                    break;
                                }
                            }
                            continue;
                        }
                
                        if (current_index === -1 || found_index < current_index) {
                            current_index = found_index;
                        }
                    }
                
                    for (let r = 0; r < current_index; r++) array.push(r);
                    array.sort((a, b) => a - b);
                    return array;
                };
                // 从下到上寻找 size 的位置（并考虑候选影响），镜像自 find_size_right 的数组逻辑
                const find_size_bottom = () => {
                    if (!board || !Array.isArray(board[0])) return -1;
                    const array = [];
                    let current_index = -1;
                    let current_target = size;
                    let compare_index = 0;
                    let delta = 0;
                
                    for (let target = size; target >= 1; target--) {
                        let found_index = -1;
                
                        // 在整列查找 target（从下到上）
                        for (let r = size - 1; r >= 0; r--) {
                            if (board[r][col - 1] === target) {
                                if (target < current_target) {
                                    // 统计区间 (current_index, r] 上候选 t 的存在情况
                                    for (let t = target + 1; t <= current_target; t++) {
                                        for (let i = r; i > current_index; i--) {
                                            if (Array.isArray(board[i][col - 1]) && board[i][col - 1].includes(t)) {
                                                delta++;
                                                break;
                                            }
                                        }
                                    }
                
                                    if (delta > 1) {
                                        // 在 (current_index, r] 中从上到下找一个候选 t 的位置 i
                                        let found = false;
                                        for (let t = current_target; t >= target + 1 && !found; t--) {
                                            for (let i = current_index + 1; i <= r; i++) {
                                                if (Array.isArray(board[i][col - 1]) && board[i][col - 1].includes(t)) {
                                                    // 将 [i, r) 的索引推入（下侧需要标注的格）
                                                    for (let j = i; j <= r - 1; j++) array.push(j);
                                                    found = true;
                                                    break;
                                                }
                                            }
                                        }
                                    } else if (delta === 1) {
                                        // 若候选 t 在该区间仅出现一次，但在区间外也出现，则整段 (current_index, r) 都需要标注
                                        for (let t = target + 1; t <= current_target; t++) {
                                            for (let i = r; i > current_index; i--) {
                                                if (Array.isArray(board[i][col - 1]) && board[i][col - 1].includes(t)) {
                                                    // 检查区间外是否也存在候选 t
                                                    for (let k = 0; k < size; k++) {
                                                        if (k > current_index && k <= r) continue;
                                                        if (Array.isArray(board[k][col - 1]) && board[k][col - 1].includes(t)) {
                                                            for (let j = current_index + 1; j < r; j++) array.push(j);
                                                            break;
                                                        }
                                                    }
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                                delta = 0;
                                found_index = r;
                                compare_index = 0;
                                break;
                            }
                        }
                
                        if (found_index === -1) {
                            // 没找到，检查 current_index 之上的未确定格子的候选数
                            for (let rr = 0; rr < size; rr++) {
                                if (Array.isArray(board[rr][col - 1]) && board[rr][col - 1].includes(target)) {
                                    if (compare_index === 0) {
                                        if (current_index < rr - 1) {
                                            current_index = rr - 1;
                                        }
                                    }
                                    compare_index++;
                                    break;
                                }
                            }
                            continue;
                        }
                
                        if (current_index === -1 || found_index > current_index) {
                            current_index = found_index;
                        }
                    }
                
                    // 收集从 current_index 之后到底部的所有行
                    for (let r = current_index + 1; r < size; r++) array.push(r);
                    array.sort((a, b) => a - b);
                    return array;
                };
                const pos_top = find_size_top();
                const pos_bottom = find_size_bottom();

                if (top_clue > 0) {
                    if (top_clue === 1) {
                        const cell = [0, col - 1];
                        const index = `A${col}`;
                        regions.push({ type: '特定组合', index, cells: [cell] });
                    } else if (top_clue === size) {
                        for (let row = 1; row <= size; row++) {
                            const cell = [row - 1, col - 1];
                            const index = `${getRowLetter(row)}${col}`;
                            regions.push({ type: '特定组合', index, cells: [cell] });
                        }
                    } else {
                        if (pos_top && Array.isArray(pos_top) && pos_top.length > 0) {
                            const cells = [];
                            // for (let r = 0; r < pos_top; r++) cells.push([r, col - 1]);
                            for (let r of pos_top) cells.push([r, col - 1]);
                            const index = cells.map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`).join('-');
                            regions.push({ type: '特定组合', index, cells });
                            // log_process(`列 ${col} 上侧线索为 ${top_clue}，添加特定组合区域 ${index}`);
                        }
                    }
                }

                if (bottom_clue > 0) {
                    if (bottom_clue === 1) {
                        const cell = [size - 1, col - 1];
                        const index = `${getRowLetter(size)}${col}`;
                        regions.push({ type: '特定组合', index, cells: [cell] });
                    } else if (bottom_clue === size) {
                        for (let row = 1; row <= size; row++) {
                            const cell = [row - 1, col - 1];
                            const index = `${getRowLetter(row)}${col}`;
                            regions.push({ type: '特定组合', index, cells: [cell] });
                        }
                    } else {
                        if (pos_bottom && Array.isArray(pos_bottom) && pos_bottom.length > 0) {
                            const cells = [];
                            // for (let r = size - 1; r > pos_bottom; r--) cells.push([r, col - 1]);
                            for (let r of pos_bottom) cells.push([r, col - 1]);
                            const index = cells.map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`).join('-');
                            regions.push({ type: '特定组合', index, cells });
                            // log_process(`列 ${col} 下侧线索为 ${bottom_clue}，添加特定组合区域 ${index}`);
                        }
                    }
                }
            }
        }
        case 'X_sums': {
            const regions = [];
            const clues = state.clues_board;
            if (!clues) return regions;

            // 上边
            for (let col = 1; col <= size; col++) {
                const clue = clues[0][col];
                if (clue && X_SUMS_CANDIDATES_MAP(size)[clue]) {
                    const A = Math.max(...X_SUMS_CANDIDATES_MAP(size)[clue]);
                    const cells_A = [];
                    for (let r = 1; r <= A; r++) cells_A.push([r-1, col-1]);
                    const index_A = cells_A
                        .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                        .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                        .join('-');

                    regions.push({ type: '特定组合', index: index_A, cells: cells_A });
                    // log_process(`X_sums 上边 clue=${clue}, cells=${JSON.stringify(cells_A)}`);
                    const B = Math.min(...X_SUMS_CANDIDATES_MAP(size)[clue]);
                    const cells_B = [];
                    for (let r = size; r > B; r--) cells_B.push([r-1, col-1]);
                    const index_B = cells_B
                        .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                        .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                        .join('-');

                    regions.push({ type: '特定组合', index: index_B, cells: cells_B });
                    // log_process(`X_sums 上边 clue=${clue}, cells=${JSON.stringify(cells_B)}`);
                }
            }
            // 下边
            for (let col = 1; col <= size; col++) {
                const clue = clues[size + 1][col];
                if (clue && X_SUMS_CANDIDATES_MAP(size)[clue]) {
                    const A = Math.max(...X_SUMS_CANDIDATES_MAP(size)[clue]);
                    const cells_A = [];
                    for (let r = size; r > size - A; r--) cells_A.push([r-1, col-1]);
                    const index_A = cells_A
                        .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                        .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                        .join('-');
                    regions.push({ type: '特定组合', index: index_A, cells: cells_A });
            
                    const B = Math.min(...X_SUMS_CANDIDATES_MAP(size)[clue]);
                    const cells_B = [];
                    for (let r = 1; r <= size - B; r++) cells_B.push([r-1, col-1]);
                    const index_B = cells_B
                        .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                        .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                        .join('-');
                    regions.push({ type: '特定组合', index: index_B, cells: cells_B });
                }
            }
            
            // 左边
            for (let row = 1; row <= size; row++) {
                const clue = clues[row][0];
                if (clue && X_SUMS_CANDIDATES_MAP(size)[clue]) {
                    const A = Math.max(...X_SUMS_CANDIDATES_MAP(size)[clue]);
                    const cells_A = [];
                    for (let c = 1; c <= A; c++) cells_A.push([row-1, c-1]);
                    const index_A = cells_A
                        .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                        .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                        .join('-');
                    regions.push({ type: '特定组合', index: index_A, cells: cells_A });
            
                    const B = Math.min(...X_SUMS_CANDIDATES_MAP(size)[clue]);
                    const cells_B = [];
                    for (let c = size; c > B; c--) cells_B.push([row-1, c-1]);
                    const index_B = cells_B
                        .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                        .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                        .join('-');
                    regions.push({ type: '特定组合', index: index_B, cells: cells_B });
                }
            }
            
            // 右边
            for (let row = 1; row <= size; row++) {
                const clue = clues[row][size + 1];
                if (clue && X_SUMS_CANDIDATES_MAP(size)[clue]) {
                    const A = Math.max(...X_SUMS_CANDIDATES_MAP(size)[clue]);
                    const cells_A = [];
                    for (let c = size; c > size - A; c--) cells_A.push([row-1, c-1]);
                    const index_A = cells_A
                        .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                        .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                        .join('-');
                    regions.push({ type: '特定组合', index: index_A, cells: cells_A });
            
                    const B = Math.min(...X_SUMS_CANDIDATES_MAP(size)[clue]);
                    const cells_B = [];
                    for (let c = 1; c <= size - B; c++) cells_B.push([row-1, c-1]);
                    const index_B = cells_B
                        .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                        .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                        .join('-');
                    regions.push({ type: '特定组合', index: index_B, cells: cells_B });
                }
            }
            return regions;
        }
        case 'sandwich': {
            const container = document.querySelector('.sudoku-container');
            if (!container) return regions;

            // 遍历每一行，检查行首或行尾是否有外提示数
            for (let row = 1; row <= size; row++) {
                const left_clue_input = container.querySelector(`input[data-row="${row}"][data-col="0"]`);
                // log_process(`检查行 ${row} 的左侧提示数: ${left_clue_input ? left_clue_input.value : ''}`);
                const right_clue_input = container.querySelector(`input[data-row="${row}"][data-col="${size + 1}"]`);
                const left_clue = left_clue_input ? parseInt(left_clue_input.value) : null;
                const right_clue = right_clue_input ? parseInt(right_clue_input.value) : null;

                if (left_clue || left_clue === 0 || right_clue || right_clue === 0) {
                    const row_cells = [];
                    for (let col = 1; col <= size; col++) {
                        row_cells.push([row - 1, col - 1]); // 转换为 0 索引
                    }

                    const index = row_cells
                        .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                        .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                        .join('-');

                    regions.push({
                        type: '特定组合',
                        index,
                        cells: row_cells,
                        // clue_nums: Array.from({ length: size }, (_, n) => n + 1),
                    });
                    // log_process(`发现特定组合：row-${row}，提示数：${left_clue || ''} ${right_clue || ''}`);
                }
            }

            // 遍历每一列，检查列首或列尾是否有外提示数
            for (let col = 1; col <= size; col++) {
                const top_clue_input = container.querySelector(`input[data-row="0"][data-col="${col}"]`);
                const bottom_clue_input = container.querySelector(`input[data-row="${size + 1}"][data-col="${col}"]`);
                const top_clue = top_clue_input ? parseInt(top_clue_input.value) : null;
                const bottom_clue = bottom_clue_input ? parseInt(bottom_clue_input.value) : null;

                if (top_clue || top_clue === 0 || bottom_clue || bottom_clue === 0) {
                    const col_cells = [];
                    for (let row = 1; row <= size; row++) {
                        col_cells.push([row - 1, col - 1]); // 转换为 0 索引
                    }
                    const index = col_cells
                        .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
                        .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                        .join('-');
                    regions.push({
                        type: '特定组合',
                        index,
                        cells: col_cells,
                        // clue_nums: Array.from({ length: size }, (_, n) => n + 1),
                    });
                }
            }
            break;
        }
        default:
            // 默认情况下，不添加任何区域
            break;
    }
    // return regions;
    // 合并有共同格子的特定组合
    const merged_regions = merge_regions_with_common_cells(regions);

    // // 返回原始区域和合并后的区域
    // return [...regions, ...merged_regions];
    // 缓存结果
    const result = [...regions, ...merged_regions];
    _special_regions_cache = result;
    _special_regions_cache_size = size;
    _special_regions_cache_mode = mode;
    // _special_regions_cache_mark_count = current_mark_count;

    return result;
}

/**
 * 通用有效性检测函数，根据当前模式自动判断所有相关区域
 */
export function isValid(board, size, row, col, num) {
    if (state.current_mode === 'exclusion') {
        return is_valid_exclusion(board, size, row, col, num);
    } else if (state.current_mode === 'quadruple') {
        return is_valid_quadruple(board, size, row, col, num);
    } else if (state.current_mode === 'add') {
        return is_valid_add(board, size, row, col, num);
    } else if (state.current_mode === 'product') {
        return is_valid_product(board, size, row, col, num);
    } else if (state.current_mode === 'ratio') {
        return is_valid_ratio(board, size, row, col, num);
    } else if (state.current_mode === 'VX') {
        return is_valid_VX(board, size, row, col, num);
    } else if (state.current_mode === 'kropki') {
        return is_valid_kropki(board, size, row, col, num);
    } else if (state.current_mode === 'consecutive') {
        return is_valid_consecutive(board, size, row, col, num);
    } else if (state.current_mode === 'renban') {
        return is_valid_renban(board, size, row, col, num);
    } else if (state.current_mode === 'fortress') {
        return is_valid_fortress(board, size, row, col, num);
    } else if (state.current_mode === 'clone') {
        return is_valid_clone(board, size, row, col, num);
    } else if (state.current_mode === 'inequality') {
        return is_valid_inequality(board, size, row, col, num);
    } else if (state.current_mode === 'odd') {
        return is_valid_odd(board, size, row, col, num);
    } else if (state.current_mode === 'odd_even') {
        return is_valid_odd_even(board, size, row, col, num);
    } else if (state.current_mode === 'anti_king') {
        return is_valid_anti_king(board, size, row, col, num);
    } else if (state.current_mode === 'anti_knight') {
        return is_valid_anti_knight(board, size, row, col, num);
    } else if (state.current_mode === 'anti_elephant') {
        return is_valid_anti_elephant(board, size, row, col, num);
    // } else if (state.current_mode === 'anti_diagonal') {
    //     return is_valid_anti_diagonal(board, size, row, col, num);
    } else if (state.current_mode === 'palindrome') {
        return is_valid_palindrome(board, size, row, col, num);
    } else if (state.current_mode === 'X_sums') {
        return is_valid_X_sums(board, size, row, col, num);
    } else if (state.current_mode === 'sandwich') {
        return is_valid_sandwich(board, size, row, col, num);
    } else if (state.current_mode === 'skyscraper') {
        // const clues = get_skyscraper_clues_from_dom(size);
        // // 在递归/循环/回溯等所有需要校验的地方传递 clues
        // return is_valid_skyscraper(board, size, row, col, num, clues);
        return is_valid_skyscraper(board, size, row, col, num);
    } else {
        // 获取当前模式（classic/diagonal/missing/...）
        const mode = state.current_mode || 'classic';
        // 获取所有相关区域
        // 为避免 cached_regions 与当前 size/mode 不匹配导致越界，
        // 在此处始终按传入的 size 与当前 mode 重新计算区域
        const regions = get_all_regions(size, mode);
        // 找出包含(row, col)的所有区域
        for (const region of regions) {
            if (region.cells.some(([r, c]) => r === row && c === col)) {
                for (const [r, c] of region.cells) {
                    if ((r !== row || c !== col) && board[r][c] === num) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
}

/**
 * 多次合并有共同格子的区域，并生成所有可能的合并区域
 */
function merge_regions_with_common_cells(regions) {
    // 新增：摩天楼、X和、三明治模式下不合并
    if (
        state.current_mode === 'skyscraper' ||
        state.current_mode === 'X_sums' ||
        state.current_mode === 'sandwich'
    ) {
        return [];
    }
    const merged = [];
    const visited = new Set();

    // 辅助函数：将格子坐标转换为字符串
    const cellToString = ([r, c]) => `${r},${c}`;

    // 遍历所有区域
    for (let i = 0; i < regions.length; i++) {
        if (visited.has(i)) continue;

        const queue = [i];
        const merged_cells = new Set();
        const merged_clue_nums = [];

        // BFS 合并所有与当前区域有交集的区域
        while (queue.length > 0) {
            const current = queue.pop();
            if (visited.has(current)) continue;

            visited.add(current);
            const region = regions[current];

            // 添加当前区域的格子和提示数
            region.cells.forEach(cell => merged_cells.add(cellToString(cell)));
            if (Array.isArray(region.clue_nums)) {
                merged_clue_nums.push(...region.clue_nums);
            }

            // 查找与当前区域有交集的其他区域
            for (let j = 0; j < regions.length; j++) {
                if (visited.has(j)) continue;

                const other = regions[j];
                if (other.cells.some(cell => merged_cells.has(cellToString(cell)))) {
                    queue.push(j);

                    // 每次发现交集时，生成一个新的合并区域
                    const temp_merged_cells = new Set(merged_cells);
                    other.cells.forEach(cell => temp_merged_cells.add(cellToString(cell)));

                    const temp_index = Array.from(temp_merged_cells)
                        .map(str => str.split(',').map(Number))
                        .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
                        .join('-');

                    const temp_clue_nums = [...merged_clue_nums, ...(other.clue_nums || [])];

                    merged.push({
                        type: '合并特定组合',
                        index: temp_index,
                        cells: Array.from(temp_merged_cells).map(str => str.split(',').map(Number)),
                        clue_nums: temp_clue_nums
                    });
                }
            }
        }

        // 最终合并区域
        const final_index = Array.from(merged_cells)
            .map(str => str.split(',').map(Number))
            .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
            .join('-');

        merged.push({
            type: '合并特定组合',
            index: final_index,
            cells: Array.from(merged_cells).map(str => str.split(',').map(Number)),
            clue_nums: merged_clue_nums
        });
    }

    return merged;
}

// 辅助函数：比较两个board状态是否相同
export function isEqual(board1, board2) {
    return JSON.stringify(board1) === JSON.stringify(board2);
}

// 辅助函数：获取所有可能的组合
export function getCombinations(array, size) {
    const result = [];
    
    function backtrack(start, current) {
        if (current.length === size) {
            result.push([...current]);
            return;
        }
        
        for (let i = start; i < array.length; i++) {
            current.push(array[i]);
            backtrack(i + 1, current);
            current.pop();
        }
    }
    
    backtrack(0, []);
    return result;
}

let board = null;
// let clues_board = null;
let size = 0;
// let solution_count = 0;
let solution = null;
let cached_regions = null;
// 主求解函数
export function solve(currentBoard, currentSize, isValid = isValid, silent = false) {
    // log_process(currentSize);
    // X和模式特殊处理：去掉边界
    // log_process(
    //     currentBoard
    //         .map(row => row.map(cell => Array.isArray(cell) ? `[${cell.join(',')}]` : cell).join(' '))
    //         .join('\n')
    // );
    // state.clues_board = currentBoard;
    invalidate_regions_cache();
    // if (state.current_mode === 'X_sums') {
    //     apply_X_sums_marks(currentBoard, currentSize);
    // }
    // if (state.current_mode === 'skyscraper') {
    //     // log_process(
    //     //     currentBoard
    //     //         .map(row => row.map(cell => Array.isArray(cell) ? `[${cell.join(',')}]` : cell).join(' '))
    //     //         .join('\n')
    //     // );
    //     // log_process(
    //     //     state.clues_board
    //     //         .map(row => row.map(cell => Array.isArray(cell) ? `[${cell.join(',')}]` : cell).join(' '))
    //     //         .join('\n')
    //     // );
    //     // state.clues_board = currentBoard;
    //     apply_skyscraper_marks(currentBoard, currentSize);
    //     // log_process(
    //     //     currentBoard
    //     //         .map(row => row.map(cell => Array.isArray(cell) ? `[${cell.join(',')}]` : cell).join(' '))
    //     //         .join('\n')
    //     // );
    //     // log_process(
    //     //     state.clues_board
    //     //         .map(row => row.map(cell => Array.isArray(cell) ? `[${cell.join(',')}]` : cell).join(' '))
    //     //         .join('\n')
    //     // );
    // }
    board = currentBoard;
    // log_process(
    //     state.clues_board
    //         .map(row => row.map(cell => Array.isArray(cell) ? `[${cell.join(',')}]` : cell).join(' '))
    //         .join('\n')
    // );
    if (state.current_mode === 'X_sums' || state.current_mode === 'sandwich' || state.current_mode === 'skyscraper') {
        // 转换 board 为去掉边界的形式
        board = Array.from({ length: currentSize }, (_, i) =>
            Array.from({ length: currentSize }, (_, j) => {
                const cell = board[i + 1][j + 1];
                if (Array.isArray(cell)) {
                    return cell.filter(n => n >= 1 && n <= currentSize);
                }
                const val = parseInt(cell);
                return isNaN(val) ? Array.from({length: currentSize}, (_, n) => n + 1) : val;
            })
        );
    }
    // log_process(
    //     board
    //         .map(row => row.map(cell => Array.isArray(cell) ? `[${cell.join(',')}]` : cell).join(' '))
    //         .join('\n')
    // );
    size = currentSize;
    state.solve_stats.solution_count = 0;
    solution = null;
    state.candidate_elimination_score = {};
    state.total_score_sum = 0;
    // state.solve_stats.solution_count = 0;

    // 新增：排除数独自动应用排除标记
    if (state.current_mode === 'exclusion') {
        apply_exclusion_marks(board, size);
    } else if (state.current_mode === 'quadruple') {
        apply_quadruple_marks(board, size);
    } else if (state.current_mode === 'odd') {
        apply_odd_marks(board, size);
    } else if (state.current_mode === 'odd_even') {
        apply_odd_even_marks(board, size);
    // } else if (state.current_mode === 'skyscraper') {
    //     apply_skyscraper_marks(board, size);
    }
    // log_process(
    //     board
    //         .map(row => row.map(cell => Array.isArray(cell) ? `[${cell.join(',')}]` : cell).join(' '))
    //         .join('\n')
    // );
    // 初始化候选数板
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const cell = board[i][j];
            if (cell === 0) {
                board[i][j] = Array.from({length: size}, (_, n) => n + 1);
            }
            else if (typeof cell === 'number' && cell !== 0) {
                const num = cell;
                board[i][j] = 0; // 临时清空
                if (!isValid(board, size, i, j, num)) {
                // if (!isValid(board, size, i, j, num)) {
                    // log_process(`[冲突] ${getRowLetter(i+1)}${j+1}=${num}与已有数字冲突，无解！`);
                    // return { changed: false, hasEmptyCandidate: true }; // 直接返回冲突状态
                    state.solve_stats.solution_count = -2; // 直接返回冲突状态
                    return {solution_count: state.solve_stats.solution_count}
                }
                board[i][j] = num; // 恢复原值
                eliminate_candidates(board, size, i, j, num); // 移除相关候选数
                // log_process("移除相关候选数");
            }
        }
    }
    // log_process(
    //     board
    //         .map(row => row.map(cell => Array.isArray(cell) ? `[${cell.join(',')}]` : cell).join(' '))
    //         .join('\n')
    // );
    // cached_regions = get_all_regions(size, state.current_mode || "classic");

    if (silent) {
        // log_process = () => {}; // 静默模式下不输出
        state.silentMode = true;
    }
    else {
        state.silentMode = false;
    }

    // 先尝试逻辑求解
    const logical_result = solve_By_Logic();

    // 添加技巧使用统计
    if (logical_result.technique_counts) {
        state.solve_stats.technique_counts = logical_result.technique_counts;
        if (!state.silentMode) log_process("\n=== 技巧使用统计 ===");
        const technique_scores = logical_result.technique_scores || {};
        for (const [technique, count] of Object.entries(logical_result.technique_counts)) {
            if (count > 0) {
                const score = technique_scores[technique] || 0;
                if (!state.silentMode) log_process(`${technique}: ${score}分x${count}次`);
            }
        }
        // 输出总分值
        if (logical_result.total_score !== undefined) {
            state.solve_stats.total_score = logical_result.total_score;
            if (!state.silentMode) log_process(`总分值: ${logical_result.total_score}`);
        }
        state.total_score_sum = Math.round(state.total_score_sum * 100) / 100; // 保留两位小数
        // if (!state.silentMode) log_process(`新的总分值: ${state.total_score_sum}`);
    }

    // 如果逻辑求解未完成，则尝试暴力求解
    if (!logical_result.isSolved) {
        if (state.techniqueSettings.Brute_Force) {
            solve_By_BruteForce();
        } else {
            if (state.solve_stats.solution_count === -2) {
                return {solution_count: state.solve_stats.solution_count};
            }
            else {
                state.solve_stats.solution_count = -1;  // 设置特殊标记值
                // log_process("暴力求解被禁用，无法继续求解。");
                return {solution_count: state.solve_stats.solution_count};  // 提前返回防止后续覆盖
                
            }
        }
    }

    // 恢复日志函数
    if (silent) {
        // log_process = originalLog;
        state.silentMode = false;
    }

    return {
        solution_count: state.solve_stats.solution_count,
        solution,
        technique_counts: state.solve_stats.technique_counts,
        total_score: state.solve_stats.total_score,
        technique_scores: logical_result.technique_scores || {}
    };
}

// 逻辑求解函数
function solve_By_Logic() {
    // const { changed, hasEmptyCandidate, technique_counts, total_score } = solve_By_Elimination(board, size);
    // log_process("=== 逻辑求解开始 ===");
    // log_process(
    //     board
    //         .map(row => row.map(cell => Array.isArray(cell) ? `[${cell.join(',')}]` : cell).join(' '))
    //         .join('\n')
    // );
    // log_process(
    //     state.clues_board
    //         .map(row => row.map(cell => Array.isArray(cell) ? `[${cell.join(',')}]` : cell).join(' '))
    //         .join('\n')
    // );
    
    const { changed, hasEmptyCandidate, technique_counts, total_score, technique_scores } = solve_By_Elimination(board, size);
    // const { changed, hasEmptyCandidate, technique_counts, total_score, technique_scores } = solve_By_Elimination(clues_board, size);
    // if (!state.silentMode) log_process("1...判断当前数独是否有解");
    
    if (hasEmptyCandidate) {
        state.solve_stats.solution_count = -2;
        // if (!state.silentMode) log_process("2...当前数独无解");
        return { isSolved: false };
    }
    // if (!state.silentMode) log_process("2...当前数独有解");

    state.logical_solution = board.map(row => [...row]);

    // 检查是否已完全解出
    let isSolved = true;
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (Array.isArray(board[i][j])) {
                isSolved = false;
                break;
            }
        }
        if (!isSolved) break;
    }
    // if (!state.silentMode) log_process("3...判断当前数独能通过逻辑推理完全解出");

    if (isSolved) {
        // if (!state.silentMode) log_process("4...当前数独通过逻辑推理完全解出");
        state.solve_stats.solution_count = 1;
        solution = board.map(row => [...row]);
        // return { isSolved: true, technique_counts, total_score };
        return { isSolved: true, technique_counts, total_score, technique_scores };
    }

    // if (!state.silentMode) log_process("4...当前候选数数独无法通过逻辑推理完全解出，请尝试暴力求解...");
    // return { isSolved: false, technique_counts, total_score };
    return { isSolved: false, technique_counts, total_score, technique_scores };
}

// 暴力求解函数
function solve_By_BruteForce() {
    if (state.solve_stats.solution_count >= 2) return;

    const target = findBestCell(board, size);
    if (!target) {
        state.solve_stats.solution_count++;
        if (state.solve_stats.solution_count === 1) {
            solution = board.map(row => row.map(cell => Array.isArray(cell) ? cell[0] : cell));
        }
        return;
    }
    if (target.hasEmpty) return;

    const { row, col, candidates } = target;
    const boardBackup = cloneBoard(board);

    for (const num of candidates) {
        if (!isValid(board, size, row, col, num)) continue;

        board[row][col] = num;
        if (!state.silentMode) log_process(`[试数] ${getRowLetter(row + 1)}${col + 1}=${num}`);
        eliminate_candidates(board, size, row, col, num);

        const { hasEmptyCandidate } = solve_By_Elimination(board, size);
        if (!hasEmptyCandidate) {
            solve_By_BruteForce();
            if (state.solve_stats.solution_count >= 2) return;
        }
        board = cloneBoard(boardBackup);
    }
}

function cloneBoard(source) {
    return source.map(row => row.map(cell => Array.isArray(cell) ? [...cell] : cell));
}

function findBestCell(board, size) {
    let best = null;
    let bestLen = Infinity;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const cell = board[r][c];
            if (!Array.isArray(cell)) continue;
            if (cell.length === 0) {
                return { hasEmpty: true };
            }
            if (cell.length < bestLen) {
                bestLen = cell.length;
                best = { row: r, col: c, candidates: [...cell] };
                if (bestLen === 1) return best;
            }
        }
    }
    return best;
}

// 将数字行号转换为字母 (1=A, 2=B, ..., 26=Z)
export function getRowLetter(rowNum) {
    return String.fromCharCode(64 + rowNum); // 65 is 'A' in ASCII
}



// 修改 countSolutions 函数
export function countSolutions(board, size) {
    // 转换为候选数板
    const candidateBoard = board.map(row => 
        row.map(cell => cell === 0 ? 
            [...Array(size)].map((_, i) => i + 1) : 
            cell
        )
    );
    
    // 使用主 solve 函数获取技巧统计
    const result = solve(candidateBoard, size);
    state.solve_stats.technique_count = result.technique_counts || {};
    
    // 传统回溯计数
    const copy = board.map(row => [...row]);
    let count = 0;
    
    function backtrack() {
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (copy[r][c] === 0) {
                    for (let num = 1; num <= size; num++) {
                        if (isValid(copy, size, r, c, num)) {
                            copy[r][c] = num;
                            if (count < 2) backtrack();
                            copy[r][c] = 0;
                            if (count >= 2) return;
                        }
                    }
                    return;
                }
            }
        }
        count++;
    }
    
    backtrack();
    return count;
}