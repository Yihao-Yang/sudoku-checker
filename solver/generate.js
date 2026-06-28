import { solve, isValid, eliminate_candidates, get_all_regions, get_special_combination_regions, invalidate_regions_cache } from './solver_tool.js';
import { log_process,backup_original_board,show_result, restore_original_board, clear_all_inputs, clear_inner_numbers, hide_generating_timer, clear_outer_clues, show_generating_timer } from './core.js';
import { state } from './state.js';
import { check_lookup_table } from './Technique.js';
import { mark_outer_clues_X_sums } from '../modules/X_sums.js';
import { mark_outer_clues_skyscraper } from '../modules/skyscraper.js';
import { mark_outer_clues_sandwich } from '../modules/sandwich.js';
import { mark_outer_clues_rossini } from '../modules/rossini.js';
import { is_valid_exclusion } from '../modules/exclusion.js';
import { is_valid_quadruple } from '../modules/quadruple.js';
// import { isValid_multi_diagonal } from '../modules/multi_diagonal.js';
// import { isValid_diagonal } from '../modules/diagonal.js';

// 自动生成标准数独题目
export function generate_puzzle(size, score_lower_limit = 0, holes_count = undefined, pre_solved_board = null, options = {}) {
    const generation_options = options && typeof options === 'object' ? options : {};
    const dig_validation_mode = generation_options.digValidationMode === 'check_next' ? 'check_next' : 'uniqueness';
    const stats_profile_mode = generation_options.statsProfile === 'minimal_uniqueness' ? 'minimal_uniqueness' : 'validation_mode';
    const stop_on_single_progress = generation_options.stopOnSingleProgress === true;
    const single_progress_check_mode = generation_options.singleProgressCheckMode === 'check_next' ? 'check_next' : 'uniqueness';
    const symmetry_override = generation_options.symmetry || null;
    // log_process(pre_solved_board);
    // log_process(
    //     pre_solved_board
    //         .map(row => row.map(cell => Array.isArray(cell) ? `[${cell.join(',')}]` : cell).join(' '))
    //         .join('\n')
    // );
    // 记录开始时间
    const start_time = performance.now();
    // 清除之前的结果
    if (state.current_mode === 'X_sums' || state.current_mode === 'sandwich' || state.current_mode === 'skyscraper' || state.current_mode === 'rossini') {
        clear_inner_numbers();
    } else {
        clear_all_inputs();
    }
    log_process('', true);
    state.clues_board = null;
    invalidate_regions_cache();
    const container = document.querySelector('.sudoku-container');

    const dom_black_template = (() => {
        if (state.current_mode !== 'missing' || !container) return null;
        let has_black_cell = false;
        const template = Array.from({ length: size }, (_, r) =>
            Array.from({ length: size }, (_, c) => {
                const input = container.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
                if (input && input.disabled) {
                    has_black_cell = true;
                    return -1;
                }
                return 0;
            })
        );
        return has_black_cell ? template : null;
    })();
    if (state.current_mode === 'X_sums' || state.current_mode === 'sandwich' || state.current_mode === 'skyscraper' || state.current_mode === 'rossini') {
        state.clues_board = Array.from({ length: size + 2 }, (_, i) =>
            Array.from({ length: size + 2 }, (_, j) => {
                const isBorder = i === 0 || i === size + 1 || j === 0 || j === size + 1;
                if (isBorder) {
                    const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
                    const valStr = input?.value ?? '';
                    if (state.is_candidates_mode && valStr.length > 1) {
                        return [...new Set(valStr.split('').map(Number))].filter(n => n >= 1 && n <= size);
                    }
                    if (valStr.trim() === '') return null; // 空=无提示（特别是三明治不能用0表示空）
                    if (state.current_mode === 'rossini') {
                        const clue = valStr.trim();
                        return (clue === '↑' || clue === '↓' || clue === '←' || clue === '→') ? clue : null;
                    }
                    const v = parseInt(valStr, 10);
                    return Number.isFinite(v) ? v : null;
                    // const v = parseInt(valStr, 10);
                    // return Number.isFinite(v) ? v : 0;
                } else {
                    // 内部格子不读取 DOM，只设为完整候选集合
                    return Array.from({ length: size }, (_, n) => n + 1);
                }
            })
        );
    }
    // log_process(
    //         state.clues_board
    //             .map(row => row.map(cell => Array.isArray(cell) ? `[${cell.join(',')}]` : cell).join(' '))
    //             .join('\n')
    //     );

    let puzzle, solution, result, holesDug, symmetry;

    // 尝试次数限制
    let try_count = 0;
    const MAX_TRY = 30;
    const existing_numbers = null;
    let has_checked_external_puzzle = false;

    const build_test_board_from_puzzle = (candidate_puzzle) => {
        if (state.current_mode === 'X_sums' || state.current_mode === 'sandwich' || state.current_mode === 'skyscraper' || state.current_mode === 'rossini') {
            return Array.from({ length: size + 2 }, (_, i) =>
                Array.from({ length: size + 2 }, (_, j) => {
                    if (i === 0 || i === size + 1 || j === 0 || j === size + 1) {
                        if (pre_solved_board && Array.isArray(pre_solved_board) && pre_solved_board.length === size + 2) {
                            const val = pre_solved_board[i] && pre_solved_board[i][j];
                            return (val === undefined || val === null) ? 0 : val;
                        }
                        return 0;
                    }
                    const cell = candidate_puzzle[i - 1][j - 1];
                    return cell === -1
                        ? -1
                        : cell === 0
                        ? [...Array(size)].map((_, n) => n + 1)
                        : cell;
                })
            );
        }
        return candidate_puzzle.map(row =>
            row.map(cell => cell === -1
                ? -1
                : cell === 0
                ? [...Array(size)].map((_, n) => n + 1)
                : cell
            )
        );
    };

    const evaluate_generated_puzzle = (candidate_puzzle) => {
        const candidate_test_board = build_test_board_from_puzzle(candidate_puzzle);
        if (dig_validation_mode === 'check_next') {
            return solve(candidate_test_board, size, isValid, true);
        }
        return solve_with_minimal_uniqueness_profile(candidate_test_board, size);
    };

    const is_generated_puzzle_acceptable = (candidate_result) => {
        if (!candidate_result) {
            return false;
        }

        if (dig_validation_mode === 'check_next') {
            return candidate_result.solution_count !== 0 && candidate_result.solution_count !== -2;
        }

        return candidate_result.solution_count === 1;
    };

    while (true) {
        try_count++;
        if (try_count > MAX_TRY) {
            log_process(`尝试${MAX_TRY}次仍未生成符合条件的题目，已中止。`);
            show_result(`生成失败，请降低分值下限或调整参数后重试。`);
            return null;
        }

        // 随机选择对称模式
        symmetry = symmetry_override || SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];

        // 如果启用了“一刀流”相关技巧，则不使用对称性（保证一刀流逻辑可用）
        if (state.techniqueSettings.Box_One_Cut || state.techniqueSettings.Box_Block_One_Cut) {
            symmetry = 'none';
        }
        // log_process(`1 ${symmetry}`)

        // 外部传入的是题面（含0）且已唯一解时，直接复用，避免再次出题
        if (!has_checked_external_puzzle && pre_solved_board && Array.isArray(pre_solved_board) && pre_solved_board.length === size) {
            has_checked_external_puzzle = true;
            const has_holes = pre_solved_board.some(row => Array.isArray(row) && row.some(cell => cell === 0));
            if (has_holes) {
                const candidate_puzzle = pre_solved_board.map(row => row.map(cell => cell));
                const candidate_result = evaluate_generated_puzzle(candidate_puzzle);
                if (is_generated_puzzle_acceptable(candidate_result)) {
                    puzzle = candidate_puzzle;
                    solution = Array.isArray(candidate_result.solution)
                        ? candidate_result.solution.map(row => row.map(cell => cell))
                        : candidate_puzzle.map(row => row.map(cell => cell));
                    result = candidate_result;
                    holesDug = 0;
                    for (let i = 0; i < size; i++) {
                        for (let j = 0; j < size; j++) {
                            if (puzzle[i][j] === 0) holesDug++;
                        }
                    }
                    log_process('检测到传入盘面已满足当前生成条件，跳过挖洞流程。');
                    break;
                }
            }
        }

        // 如果外部提供了已生成的终盘，则直接使用，避免重复生成
        if (pre_solved_board && Array.isArray(pre_solved_board)) {
            if (pre_solved_board.length === size) {
                // 直接使用同尺寸的外部终盘
                // solution = pre_solved_board;
                // log_process(pre_solved_board
                //     .map(row => row.map(cell => (cell === 0 ? '.' : cell)).join(''))
                //     .join('')
                // );
                solution = generate_solution(size, existing_numbers, symmetry, pre_solved_board);
                // log_process(solution
                //     .map(row => row.map(cell => (cell === 0 ? '.' : cell)).join(''))
                //     .join('')
                // );
        // log_process(`${symmetry}`)
                // log_process('使用外部传入的终盘（跳过终盘生成）...');
            } else if (pre_solved_board.length === size + 2) {
                // log_process(pre_solved_board);
                // solution = generate_solution(size, existing_numbers, symmetry, pre_solved_board);
                // log_process(solution);
                // 外部传入的是带边框的盘面（size+2），去掉边界后作为终盘
                solution = Array.from({ length: size }, (_, i) =>
                    Array.from({ length: size }, (_, j) => {
                        const val = pre_solved_board[i + 1] && pre_solved_board[i + 1][j + 1];
                        return (typeof val === 'number' && val > 0) ? val : 0;
                    })
                );
        // log_process(`2 ${symmetry}`)
                // solution = generate_solution(size, existing_numbers, symmetry, solution);
                // log_process(solution);
                // log_process('使用外部传入的带边界终盘，已去除边界并作为终盘使用...');
            } else {
            // log_process('随便说点啥...');
                // 尺寸不匹配，退回生成终盘
                log_process('传入的外部终盘尺寸不匹配，改为自动生成终盘...');
                const seed_board = dom_black_template ? dom_black_template.map(row => [...row]) : null;
                solution = generate_solution(size, existing_numbers, symmetry, seed_board);
                if (!solution) {
                    log_process('生成终盘失败，重试...');
                    continue;
                }
            }
            // solution = pre_solved_board;
            // // log_process(pre_solved_board);
            // // solution = generate_solution(size, existing_numbers, symmetry, pre_solved_board);
            // // log_process(solution);
            // // log_process('', true);
        } else {
            // 生成终盘
            const seed_board = dom_black_template ? dom_black_template.map(row => [...row]) : null;
            solution = generate_solution(size, existing_numbers, symmetry, seed_board);
            // log_process(solution
            //     .map(row => row.map(cell => (cell === 0 ? '.' : cell)).join(''))
            //     .join('')
            // );
            // log_process(`尝试生成对称模式: ${symmetry}`);
            // log_process('', true);
            // solution = generate_solution_old(size, existing_numbers, symmetry);
            // puzzle = solution;
            // return puzzle;
            if (!solution) {
                log_process('生成终盘失败，重试...');
                continue;
            }
        }
        // log_process(solution
        //     .map(row => row.map(cell => (cell === 0 ? '.' : cell)).join(' '))
        //     .join('\n')
        // );

        // // 记录结束时间
        // const end_time = performance.now();
        // const elapsed = ((end_time - start_time) / 1000).toFixed(3); // 秒，保留三位小数

        // log_process(`挖洞前用时${elapsed}秒）`);
        // 挖洞得到题目
        puzzle = dig_holes(solution, size, score_lower_limit, symmetry, holes_count, {
            mode: dig_validation_mode,
            stopOnSingleProgress: stop_on_single_progress,
            singleProgressCheckMode: single_progress_check_mode
        });
        // log_process(`3 ${symmetry}`)
        // 记录结束时间
        // const end_time_1 = performance.now();
        // const elapsed_1 = ((end_time_1 - start_time) / 1000).toFixed(3); // 秒，保留三位小数

        // log_process(`挖洞后用时${elapsed_1}秒）`);
        // puzzle = solution;
        // log_process(puzzle
        //     .map(row => row.map(cell => (cell === 0 ? '.' : cell)).join(' '))
        //     .join('\n')
        // );

        // 计算实际挖洞数
        holesDug = 0;
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (puzzle[i][j] === 0) holesDug++;
            }
        }

        result = evaluate_generated_puzzle(puzzle);

        // 最终校验：普通自动出题保留唯一解限制，自动出卡点仅排除无解盘面
        if (!is_generated_puzzle_acceptable(result)) {
            continue;
        }

        break;
    }

    if (dig_validation_mode === 'check_next' && stats_profile_mode === 'minimal_uniqueness') {
        const minimal_uniqueness_result = solve_with_minimal_uniqueness_profile(build_test_board_from_puzzle(puzzle), size);
        if (minimal_uniqueness_result) {
            result = minimal_uniqueness_result;
        }
    }

    // log_process('', true);
    const score_label = (dig_validation_mode === 'check_next' && stats_profile_mode === 'minimal_uniqueness')
        ? '分值（最简唯一解）'
        : '分值';
    if (state.current_mode === 'X_sums' || state.current_mode === 'sandwich' || state.current_mode === 'skyscraper' || state.current_mode === 'rossini') {
        log_process(`${size}宫格数独生成成功，${score_label}：${state.solve_stats.total_score}，提示数: ${size*size-holesDug}`);
    } else {
        log_process(`${size}宫格数独生成成功，${score_label}：${state.solve_stats.total_score}，提示数: ${size*size-holesDug}`);
    }

    // 3. 填充到网格
    // container = document.querySelector('.sudoku-container');
    const isBorderedMode = ['X_sums', 'sandwich', 'skyscraper', 'rossini'].includes(state.current_mode);
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const row = isBorderedMode ? i + 1 : i;
            const col = isBorderedMode ? j + 1 : j;
            const input = container.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
            if (input) {
                if ((state.current_mode === 'missing' && input.disabled) || puzzle[i][j] === -1) {
                    input.value = '';
                    continue;
                }
                input.value = puzzle[i][j] || '';
            }
        }
    }

    // 记录结束时间
    const end_time = performance.now();
    const elapsed = ((end_time - start_time) / 1000).toFixed(3); // 秒，保留三位小数

    backup_original_board();
    show_result(`已生成${size}宫格数独题目（用时${elapsed}秒）`);
    // log_process(`生成用时: ${elapsed} 秒`);

    // if (result && result.technique_counts) {
    //     log_process("\n=== 技巧使用统计 ===");
    //     for (const [technique, count] of Object.entries(result.technique_counts)) {
    //         if (count > 0) {
    //             log_process(`${technique}: ${count}次`);
    //         }
    //     }
    //     if (state.solve_stats.total_score !== undefined) {
    //         log_process(`总分值: ${state.solve_stats.total_score}`);
    //     }
    // }
    if (result && result.technique_counts) {
        const stats_title = (dig_validation_mode === 'check_next' && stats_profile_mode === 'minimal_uniqueness')
            ? "\n=== 技巧使用统计（最简唯一解） ==="
            : "\n=== 技巧使用统计 ===";
        log_process(stats_title);
        const technique_scores = result.technique_scores || {};
        for (const [technique, count] of Object.entries(result.technique_counts)) {
            if (count > 0) {
                const score = technique_scores[technique] || 0;
                log_process(`${technique}: ${score}分x${count}次`);
            }
        }
        if (state.solve_stats.total_score !== undefined) {
            log_process(`总分值: ${state.solve_stats.total_score}`);
        }
    }

    // log_process(`新的总分值: ${state.total_score_sum}`);

    return {
        puzzle: puzzle,
        solution: solution
    };
}

export function generate_chokepoint_puzzle(size, score_lower_limit = 0, holes_count = undefined, pre_solved_board = null) {
    return generate_puzzle(size, score_lower_limit, holes_count, pre_solved_board, {
        digValidationMode: 'check_next',
        statsProfile: 'minimal_uniqueness'
    });
}

export function generate_real_chokepoint_puzzle(size, score_lower_limit = 0, holes_count = undefined, pre_solved_board = null) {
    return generate_puzzle(size, score_lower_limit, holes_count, pre_solved_board, {
        digValidationMode: 'check_next',
        statsProfile: 'minimal_uniqueness',
        stopOnSingleProgress: true,
        singleProgressCheckMode: 'uniqueness'
    });
}

// 生成外提示数独题目
export function generate_exterior_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    // 记录开始时间
    const start_time = performance.now();
    const interior_size = size;
    const total_size = interior_size + 2;

    state.clues_board = null;
    clear_inner_numbers();
    clear_outer_clues();
    log_process('', true);
    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    const grid = container.querySelector('.sudoku-grid');
    if (!grid) return;
    invalidate_regions_cache();

    // 1) 生成完整终盘（内盘）
    const solved_interior = generate_solution(interior_size);
    if (!solved_interior) {
        log_process('生成终盘失败，无法出题。');
        show_result('生成失败，请重试。');
        return;
    }

    // // 2) 把终盘暂时填入内部以便标记外部提示（可见数）
    // for (let r = 1; r <= interior_size; r++) {
    //     for (let c = 1; c <= interior_size; c++) {
    //         const val = solved_interior[r - 1][c - 1];
    //         const input = grid.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
    //         if (input) input.value = val;
    //     }
    // }
    // 2) 把终盘临时填入内部以便标记外部提示（可见数）
    const board_all = Array.from({ length: total_size }, () => Array.from({ length: total_size }, () => 0));
    for (let r = 1; r <= interior_size; r++) {
        for (let c = 1; c <= interior_size; c++) {
            const val = solved_interior[r - 1][c - 1];
            const input = grid.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
            // 与DOM同步，填上内部数字
            if (input) input.value = val;
            board_all[r][c] = val;
        }
    }

    // 使用现有标记函数依据已填内部数字自动标注外部提示
    if (state.current_mode === 'X_sums') {
        mark_outer_clues_X_sums(interior_size);
    } else if (state.current_mode === 'sandwich') {
        mark_outer_clues_sandwich(interior_size);
    } else if (state.current_mode === 'skyscraper') {
        mark_outer_clues_skyscraper(interior_size);
    } else if (state.current_mode === 'rossini') {
        mark_outer_clues_rossini(interior_size);
    }

    // 将 DOM 中标记的外部提示同步回 board_all 的边界位置
    for (let r = 0; r < total_size; r++) {
        for (let c = 0; c < total_size; c++) {
            if (r === 0 || r === total_size - 1 || c === 0 || c === total_size - 1) {
                const input = grid.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
                const raw = input?.value ?? '';
                if (raw.trim() === '') {
                    board_all[r][c] = null;
                } else {
                    if (state.current_mode === 'rossini') {
                        const clue = raw.trim();
                        board_all[r][c] = (clue === '↑' || clue === '↓' || clue === '←' || clue === '→') ? clue : null;
                        continue;
                    }
                    const v = parseInt(raw, 10);
                    board_all[r][c] = Number.isFinite(v) ? v : null; // 允许 0
                }
                // const v = parseInt(input?.value ?? '', 10);
                // board_all[r][c] = Number.isFinite(v) && v > 0 ? v : 0;
            }
        }
    }
    
    // 初始化 state.clues_board（从 DOM 同步刚才生成的提示）
    state.clues_board = Array.from({ length: total_size }, (_, r) => 
        Array.from({ length: total_size }, (_, c) => {
            const isBorder = r === 0 || r === total_size - 1 || c === 0 || c === total_size - 1;
            if (isBorder) {
                const input = grid.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
                const raw = input?.value ?? '';
                if (raw.trim() === '') return null;
                if (state.current_mode === 'rossini') {
                    const clue = raw.trim();
                    return (clue === '↑' || clue === '↓' || clue === '←' || clue === '→') ? clue : null;
                }
                const v = parseInt(raw, 10);
                return Number.isFinite(v) ? v : null; // 允许 0
                // const v = parseInt(input?.value ?? '', 10);
                // return (Number.isFinite(v) && v > 0) ? v : 0;
            }
            return 0;
        })
    );
    // log_process(
    //     board_all
    //         .map(row => row.map(cell => Array.isArray(cell) ? `[${cell.join(',')}]` : cell).join(' '))
    //         .join('\n')
    // );

    // 清除内部数字，准备进行提示数挖空
    clear_inner_numbers();

    // log_process(`注意生成的斜线位置，若无解，请重启网页`);
    log_process(`正在生成题目，请稍候...`);
    log_process('九宫：1-5分钟，超时请重启页面或调整限制条件');
    show_result(`正在生成题目，请稍候...`);
    show_generating_timer();

    setTimeout(() => {
        const {puzzle: inner_puzzle} = generate_puzzle(interior_size, score_lower_limit, holes_count, board_all);

        // 3) 按对称规则尝试删除外提示（对抗搜索）
        const SYMMETRY_TYPES = ['central','central','central','central','central','diagonal','diagonal','anti-diagonal','anti-diagonal','horizontal','vertical'];
        const symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];

        const get_symmetric_position = (row, col, size, symmetry) => {
            if (state.current_mode === 'sandwich') {
                symmetry = 'diagonal';
            }
            switch (symmetry) {
                case 'central': return [size - 1 - row, size - 1 - col];
                case 'diagonal': return [col, row];
                case 'anti-diagonal': return [size - 1 - col, size - 1 - row];
                case 'horizontal': return [size - 1 - row, col];
                case 'vertical': return [row, size - 1 - col];
                default: return [row, col];
            }
        };

        // 收集所有外提示位置（排除四个角落）
        let clue_positions = [];
        for (let i = 1; i <= interior_size; i++) {
            clue_positions.push([0, i]);            // 上边缘
            clue_positions.push([total_size - 1, i]); // 下边缘
            clue_positions.push([i, 0]);            // 左边缘
            clue_positions.push([i, total_size - 1]); // 右边缘
        }
        shuffle(clue_positions);

        const processed = new Set();
        for (const [r, c] of clue_positions) {
            if (processed.has(`${r},${c}`)) continue;
            if (state.clues_board[r][c] == null) continue;
            // if (state.clues_board[r][c] === 0) continue;

            const [sr, sc] = get_symmetric_position(r, c, total_size, symmetry);
            
            // 确保对称位置也是有效的边界（非角落）
            const isSymmetricBorder = (sr === 0 || sr === total_size - 1 || sc === 0 || sc === total_size - 1) && 
                                    !((sr === 0 || sr === total_size - 1) && (sc === 0 || sc === total_size - 1));
            
            const val1 = state.clues_board[r][c];
            const val2 = isSymmetricBorder ? state.clues_board[sr][sc] : null;

            // 尝试删除
            state.clues_board[r][c] = null;
            if (isSymmetricBorder) state.clues_board[sr][sc] = null;
            
            const input1 = grid.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
            const input2 = isSymmetricBorder ? grid.querySelector(`input[data-row="${sr}"][data-col="${sc}"]`) : null;
            if (input1) input1.value = '';
            if (input2) input2.value = '';

            // // 检测唯一解 (传入全空的内盘进行校验)
            // const puzzle = Array.from({ length: interior_size }, () => Array(interior_size).fill(0));
            // 检测唯一解 (构造包含当前外提示和空内盘的完整棋盘供求解器使用)
            const puzzle = state.clues_board.map(row => [...row]);
            for (let ir = 1; ir <= interior_size; ir++) {
                for (let ic = 1; ic <= interior_size; ic++) {
                    // puzzle[ir][ic] = inner_puzzle[ir - 1][ic - 1];
                    const val = inner_puzzle[ir - 1][ic - 1];
                    // 如果是 0，则赋予全部候选数数组，否则赋予固定值
                    puzzle[ir][ic] = val === 0 
                        ? Array.from({ length: interior_size }, (_, i) => i + 1) 
                        : val;
                }
            }
    //             log_process(
    //     puzzle
    //         .map(row => row.map(cell => Array.isArray(cell) ? `[${cell.join(',')}]` : cell).join(' '))
    //         .join('\n')
    // );
            
            backup_original_board();
            const res = solve(puzzle, interior_size, isValid, true);
            restore_original_board();

            if (res.solution_count === 1) {
                // 唯一解，确认删除
                // log_process(`尝试删除提示 (${r},${c}) & (${sr},${sc}): 唯一解`);
            } else {
                // 不是唯一解，还原
                state.clues_board[r][c] = val1;
                if (input1) input1.value = (val1 ?? '');
                if (isSymmetricBorder) {
                    state.clues_board[sr][sc] = val2;
                    if (input2) input2.value = (val2 ?? '');
                }
                // state.clues_board[r][c] = val1;
                // if (input1) input1.value = val1;
                // if (isSymmetricBorder) {
                //     state.clues_board[sr][sc] = val2;
                //     if (input2) input2.value = val2;
                // }
                // log_process(`尝试删除提示 (${r+1},${c+1}) & (${sr+1},${sc+1}): 非唯一解，已还原`);
            }
            processed.add(`${r},${c}`);
            processed.add(`${sr},${sc}`);
        }

        generate_puzzle(interior_size, score_lower_limit, holes_count, inner_puzzle);
        hide_generating_timer();
        const elapsed = ((performance.now() - start_time) / 1000).toFixed(3);
        show_result(`已生成${interior_size}宫格数独题目（用时${elapsed}秒）`);
    }, 0);
}

// 修改 generate_solution 函数，返回只包含给定数字的题目盘面
export function generate_solution(sudoku_size, existing_numbers = null, symmetry = 'none', pre_solved_board = null) {
    // log_process("生成终盘...");
    // if (!pre_solved_board) {
    if (state.current_mode === 'X_sums' || state.current_mode === 'sandwich' || state.current_mode === 'skyscraper' || state.current_mode === 'rossini') {
        let board = pre_solved_board;
        if (!pre_solved_board) {
            board = generate_solution_old(sudoku_size);
        }
        if (!board) {
            show_result('多次尝试无法生成终盘，终止本次生成流程');
            log_process('多次尝试无法生成终盘，终止本次生成流程');
            hide_generating_timer();
            throw new Error('多次尝试无法生成终盘，终止本次生成流程');
            // log_process('无解')
            return null;
        }
        return board;
    }

    if ((state.current_mode === 'renban' || state.current_mode === 'pyramid') && !pre_solved_board) {
        const board = generate_solution_new(sudoku_size);
        if (!board) {
            show_result('多次尝试无法生成终盘，终止本次生成流程');
            log_process('多次尝试无法生成终盘，终止本次生成流程');
            hide_generating_timer();
            throw new Error('多次尝试无法生成终盘，终止本次生成流程');
        }
        return board;
    }
    // }
    // if (pre_solved_board && Array.isArray(pre_solved_board) && pre_solved_board.length === sudoku_size + 2) {
    //     pre_solved_board = pre_solved_board.slice(1, -1).map(row => row.slice(1, -1));
    // }
    
    // 如果没有提供终盘，则用generate_solution_old生成一个终盘
    let use_external_board = false;
    if (!pre_solved_board) {
        pre_solved_board = generate_solution_old(sudoku_size);
        if (!pre_solved_board) {
            show_result('多次尝试无法生成终盘，终止本次生成流程');
            log_process('多次尝试无法生成终盘，终止本次生成流程');
            hide_generating_timer();
            throw new Error('多次尝试无法生成终盘，终止本次生成流程');
            // log_process('无解')
            return null;
        }
        // log_process(pre_solved_board
        //     .map(row => row.map(cell => (cell === 0 ? '.' : cell)).join(''))
        //     .join('\n')
        // );
        // pre_solved_board = generate_solved_board_brute_force(sudoku_size);
        
        use_external_board = true;
        // log_process("未提供终盘，已自动生成一个终盘用于指导给数");
    } else if (pre_solved_board && Array.isArray(pre_solved_board) && pre_solved_board.length === sudoku_size) {
        // 验证提供的终盘是否完整
        let is_complete = true;
        const is_missing_mode = state.current_mode === 'missing';
        for (let i = 0; i < sudoku_size; i++) {
            for (let j = 0; j < sudoku_size; j++) {
                const cell = pre_solved_board[i][j];
                if (is_missing_mode) {
                    // 缺一门允许 -1 作为黑格，其余必须是 1..size 的定值
                    if (cell === -1) continue;
                    if (!Number.isInteger(cell) || cell < 1 || cell > sudoku_size) {
                        is_complete = false;
                        break;
                    }
                } else if (!cell || cell === 0) {
                    is_complete = false;
                    break;
                }
            }
            if (!is_complete) break;
        }

        if (is_complete) {
            if (is_missing_mode) {
                log_process("检测到缺一门完整终盘，直接使用该终盘进行挖洞");
                return pre_solved_board.map((row) => row.map((cell) => cell));
            }
            log_process("检测到外部传入的完整终盘，将按照该终盘给数");
            use_external_board = true;
        }
    }

    const blocked_cell_keys = new Set();
    if (pre_solved_board && Array.isArray(pre_solved_board) && pre_solved_board.length === sudoku_size) {
        for (let r = 0; r < sudoku_size; r++) {
            for (let c = 0; c < sudoku_size; c++) {
                if (pre_solved_board[r][c] === -1) {
                    blocked_cell_keys.add(`${r},${c}`);
                }
            }
        }
    }
    const is_blocked_cell = (row, col) => blocked_cell_keys.has(`${row},${col}`);

    // 初始化为候选数数组
    let sudoku_board;
    if (state.current_mode === 'X_sums' || state.current_mode === 'sandwich' || state.current_mode === 'skyscraper' || state.current_mode === 'rossini') {
        sudoku_board = Array.from({ length: sudoku_size + 2 }, (_, i) =>
            Array.from({ length: sudoku_size + 2 }, (_, j) => {
                if (i === 0 || i === sudoku_size + 1 || j === 0 || j === sudoku_size + 1) {
                    return 0; // 边界填充为 0
                }
                return [...Array(sudoku_size)].map((_, n) => n + 1); // 中间部分填充候选数
            })
        );
    } else {
        sudoku_board = Array.from({ length: sudoku_size }, (_, r) =>
            Array.from({ length: sudoku_size }, (_, c) =>
                is_blocked_cell(r, c)
                    ? -1
                    : [...Array(sudoku_size)].map((_, i) => i + 1)
            )
        );
        if (blocked_cell_keys.size === 0) {
            check_lookup_table(sudoku_board, sudoku_size);
        }
    }

    // 主动给数的记录
    let given_numbers = [];
    
    // 如果有已有数字，直接填入
    if (existing_numbers) {
        for (let r = 0; r < sudoku_size; r++) {
            for (let c = 0; c < sudoku_size; c++) {
                if (existing_numbers[r][c] > 0 && !is_blocked_cell(r, c)) {
                    given_numbers.push({ row: r, col: c, num: existing_numbers[r][c] });
                    log_process(`初始给定: [${r+1},${c+1}] = ${existing_numbers[r][c]}`);
                }
            }
        }
    }

    let max_attempts = 10000;
    let attempt_count = 0;

    // 获取所有区域并计算每个格子所属的区域数量
    let regions = get_all_regions(sudoku_size, state.current_mode);
    // 如果是反对角线模式，仅返回两条对角线区域
    if (state.current_mode === 'anti_diagonal') {
        const diag1_cells = [];
        const diag2_cells = [];
        for (let i = 0; i < sudoku_size; i++) {
            diag1_cells.push([i, i]);
            diag2_cells.push([i, sudoku_size - 1 - i]);
        }
        regions = [
            { type: '对角线', index: 1, cells: diag1_cells },
            { type: '对角线', index: 2, cells: diag2_cells }
        ];
    }
    const special_regions = get_special_combination_regions(null, sudoku_size, state.current_mode);
    if (Array.isArray(special_regions) && special_regions.length > 0) {
        regions = regions.concat(special_regions);
    }
    const region_counts = Array.from({ length: sudoku_size }, () => Array(sudoku_size).fill(0));
    for (const region of regions) {
        for (const [r, c] of region.cells) {
            region_counts[r][c]++;
        }
    }
    // // 输出每个格子的区域数量
    // for (let r = 0; r < region_counts.length; r++) {
    //     let rowStr = '';
    //     for (let c = 0; c < region_counts[r].length; c++) {
    //         rowStr += `(${r+1},${c+1}):${region_counts[r][c]} `;
    //     }
    //     log_process(rowStr);
    // }
    // // 生成所有格子的坐标并统计区域数量
    // const regions = get_all_regions(sudoku_size, state.current_mode);
    // const region_counts = Array.from({ length: sudoku_size }, () => Array(sudoku_size).fill(0));
    // for (const region of regions) {
    //     for (const [r, c] of region.cells) {
    //         if (r >= 0 && r < sudoku_size && c >= 0 && c < sudoku_size) {
    //             region_counts[r][c]++;
    //         }
    //     }
    // }
    // 生成所有格子的坐标并打乱
    const cell_positions = [];
    for (let r = 0; r < sudoku_size; r++) {
        for (let c = 0; c < sudoku_size; c++) {
            if (is_blocked_cell(r, c)) continue;
            cell_positions.push([r, c]);
        }
    }
    shuffle(cell_positions);
    // 按“本格与对称格区域数量的平均值”升序排序
    cell_positions.sort((a, b) => {
        function avg_region_count(pos) {
            const [row, col] = pos;
            const sym = get_symmetric_positions(row, col, sudoku_size, symmetry)
                .filter(([sr, sc]) => !is_blocked_cell(sr, sc));
            if (sym.length > 0) {
                const [sym_row, sym_col] = sym[0];
                return (region_counts[row][col] + region_counts[sym_row][sym_col]) / 2;
            } else {
                return region_counts[row][col];
            }
        }
        return avg_region_count(a) - avg_region_count(b);
    });
    // // 按区域数量升序排序（优先给区域少的格子）
    // cell_positions.sort((a, b) => region_counts[a[0]][a[1]] - region_counts[b[0]][b[1]]);

    // 初始唯一解检测
    let test_board;
    if (state.current_mode === 'X_sums' || state.current_mode === 'sandwich' || state.current_mode === 'skyscraper' || state.current_mode === 'rossini') {
        test_board = Array.from({ length: sudoku_size + 2 }, (_, r) =>
            Array.from({ length: sudoku_size + 2 }, (_, c) => {
                const found = given_numbers.find(item => item.row === r && item.col === c);
                return found ? found.num : 0;
            })
        );
    } else {
        test_board = Array.from({ length: sudoku_size }, (_, r) =>
            Array.from({ length: sudoku_size }, (_, c) => {
                const found = given_numbers.find(item => item.row === r && item.col === c);
                return found ? found.num : (is_blocked_cell(r, c) ? -1 : 0);
            })
        );
    }
    
    const result = solve(
        test_board.map(r => r.map(cell => cell === 0 ? [...Array(sudoku_size)].map((_, n) => n + 1) : cell)),
        sudoku_size,
        isValid,
        true
    );
    
    // 用逻辑解更新候选数
    if (result.solution_count === 1) {
        // log_process("初始检测即得到唯一解");
        // 如果使用外部终盘，需要验证解是否匹配
        if (use_external_board) {
            let matches = true;
            for (let i = 0; i < sudoku_size; i++) {
                for (let j = 0; j < sudoku_size; j++) {
                    if (result.solution[i][j] !== pre_solved_board[i][j]) {
                        matches = false;
                        break;
                    }
                }
                if (!matches) break;
            }
            if (matches) {
                // log_process("初始解匹配外部终盘，返回题目盘面");
                // 返回只包含给定数字的稀疏盘面
                return Array.from({ length: sudoku_size }, (_, r) =>
                    Array.from({ length: sudoku_size }, (_, c) => {
                        const found = given_numbers.find(item => item.row === r && item.col === c);
                        return found ? found.num : (is_blocked_cell(r, c) ? -1 : 0);
                    })
                );
            } else {
                log_process("初始解不匹配外部终盘，需要继续给数");
                // 继续执行后续逻辑
            }
        } else {
            // 没有外部终盘，返回题目盘面（只包含给定数字）
            // log_process("返回题目盘面（只包含给定数字）");
            return Array.from({ length: sudoku_size }, (_, r) =>
                Array.from({ length: sudoku_size }, (_, c) => {
                    const found = given_numbers.find(item => item.row === r && item.col === c);
                    return found ? found.num : (is_blocked_cell(r, c) ? -1 : 0);
                })
            );
        }
    }
    
    // 更新逻辑解
    if (state.logical_solution) {
        for (let i = 0; i < sudoku_size; i++) {
            for (let j = 0; j < sudoku_size; j++) {
                if (Array.isArray(state.logical_solution[i][j])) {
                    sudoku_board[i][j] = [...state.logical_solution[i][j]];
                } else {
                    sudoku_board[i][j] = state.logical_solution[i][j];
                }
            }
        }
    }

    function backtrack(cell_index = 0) {
        if (++attempt_count > max_attempts) {
            log_process(`达到最大尝试次数 ${max_attempts}，停止生成`);
            return false;
        }
        if (cell_index >= cell_positions.length) return true;

        const [row, col] = cell_positions[cell_index];

        // 获取对称位置
        const symmetric_positions = get_symmetric_positions(row, col, sudoku_size, symmetry)
            .filter(([sr, sc]) => !is_blocked_cell(sr, sc));
        let sym_row = row, sym_col = col;
        if (symmetric_positions.length > 0) {
            [sym_row, sym_col] = symmetric_positions[0];
        }

        // 跳过：只有当本格和对称格都已填定时才跳过
        if (
            (!Array.isArray(sudoku_board[row][col]) || sudoku_board[row][col].length === 1) &&
            (!Array.isArray(sudoku_board[sym_row][sym_col]) || sudoku_board[sym_row][sym_col].length === 1)
        ) {
            return backtrack(cell_index + 1);
        }

        // 获取两个格子的候选数
        let candidates1, candidates2;
        if (!Array.isArray(sudoku_board[row][col]) || sudoku_board[row][col].length === 1) {
            const filledNum = Array.isArray(sudoku_board[row][col])
                ? sudoku_board[row][col][0]
                : sudoku_board[row][col];
            candidates1 = [filledNum];
        } else {
            // 如果使用外部终盘，优先使用终盘中该位置的数字
            if (use_external_board && pre_solved_board[row] && pre_solved_board[row][col]) {
                candidates1 = [pre_solved_board[row][col]];
            } else {
                candidates1 = shuffle([...sudoku_board[row][col]]);
            }
        }
        
        if (!Array.isArray(sudoku_board[sym_row][sym_col]) || sudoku_board[sym_row][sym_col].length === 1) {
            const filledNum = Array.isArray(sudoku_board[sym_row][sym_col])
                ? sudoku_board[sym_row][sym_col][0]
                : sudoku_board[sym_row][sym_col];
            candidates2 = [filledNum];
        } else {
            // 如果使用外部终盘，优先使用终盘中该位置的数字
            if (use_external_board && pre_solved_board[sym_row] && pre_solved_board[sym_row][sym_col]) {
                candidates2 = [pre_solved_board[sym_row][sym_col]];
            } else {
                candidates2 = shuffle([...sudoku_board[sym_row][sym_col]]);
            }
        }

        for (const num1 of candidates1) {
            for (const num2 of candidates2) {
                // 如果是同一个格子（中心格），只填一次
                if (row === sym_row && col === sym_col && num1 !== num2) continue;
                if (!isValid(sudoku_board, sudoku_size, row, col, num1)) continue;
                if (!(row === sym_row && col === sym_col) && !isValid(sudoku_board, sudoku_size, sym_row, sym_col, num2)) continue;

                backup_original_board();
                sudoku_board[row][col] = [num1];
                if (!(row === sym_row && col === sym_col)) {
                    sudoku_board[sym_row][sym_col] = [num2];
                }
                given_numbers.push({ row, col, num: num1 });
                if (!(row === sym_row && col === sym_col)) {
                    given_numbers.push({ row: sym_row, col: sym_col, num: num2 });
                }

                // // 输出给数信息
                // if (row === sym_row && col === sym_col) {
                //     log_process(`尝试给数 #${given_numbers.length}: [${row+1},${col+1}] = ${num1}`);
                // } else {
                //     log_process(`尝试给数 #${given_numbers.length-1},#${given_numbers.length}: [${row+1},${col+1}] = ${num1}, [${sym_row+1},${sym_col+1}] = ${num2}`);
                // }

                // 构造只包含主动给数的盘面
                if (state.current_mode === 'X_sums' || state.current_mode === 'sandwich' || state.current_mode === 'skyscraper' || state.current_mode === 'rossini') {
                    test_board = Array.from({ length: sudoku_size + 2 }, (_, r) =>
                        Array.from({ length: sudoku_size + 2 }, (_, c) => {
                            const found = given_numbers.find(item => item.row === r && item.col === c);
                            return found ? found.num : 0;
                        })
                    );
                } else {
                    test_board = Array.from({ length: sudoku_size }, (_, r) =>
                        Array.from({ length: sudoku_size }, (_, c) => {
                            const found = given_numbers.find(item => item.row === r && item.col === c);
                            return found ? found.num : (is_blocked_cell(r, c) ? -1 : 0);
                        })
                    );
                }

                // 唯一解检测
                const result = solve(
                    test_board.map(r => r.map(cell => cell === 0 ? [...Array(sudoku_size)].map((_, n) => n + 1) : cell)),
                    sudoku_size,
                    isValid,
                    true
                );

                if (result.solution_count === 0 || result.solution_count === -2) {
                    log_process(`  → 无解或冲突，回溯`);
                    restore_original_board();
                    sudoku_board[row][col] = candidates1;
                    if (!(row === sym_row && col === sym_col)) sudoku_board[sym_row][sym_col] = candidates2;
                    given_numbers.pop();
                    if (!(row === sym_row && col === sym_col)) given_numbers.pop();
                    continue;
                }

                // 找到唯一解
                if (result.solution_count === 1) {
                    // 如果使用外部终盘，验证解是否匹配
                    if (use_external_board) {
                        let matches = true;
                        for (let i = 0; i < sudoku_size; i++) {
                            for (let j = 0; j < sudoku_size; j++) {
                                if (result.solution[i][j] !== pre_solved_board[i][j]) {
                                    matches = false;
                                    break;
                                }
                            }
                            if (!matches) break;
                        }
                        
                        if (matches) {
                            // 解匹配，返回题目盘面（只包含给定数字）
                            // log_process(`  → 找到唯一解且匹配外部终盘！共给定 ${given_numbers.length} 个数字`);
                            return Array.from({ length: sudoku_size }, (_, r) =>
                                Array.from({ length: sudoku_size }, (_, c) => {
                                    const found = given_numbers.find(item => item.row === r && item.col === c);
                                    return found ? found.num : (is_blocked_cell(r, c) ? -1 : 0);
                                })
                            );
                        } else {
                            // 解不匹配，回溯
                            log_process(`  → 找到唯一解但不匹配外部终盘，回溯`);
                            restore_original_board();
                            sudoku_board[row][col] = candidates1;
                            if (!(row === sym_row && col === sym_col)) sudoku_board[sym_row][sym_col] = candidates2;
                            given_numbers.pop();
                            if (!(row === sym_row && col === sym_col)) given_numbers.pop();
                            continue;
                        }
                    } else {
                        // 没有外部终盘，返回题目盘面（只包含给定数字）
                        log_process(`  → 找到唯一解！共给定 ${given_numbers.length} 个数字`);
                        return Array.from({ length: sudoku_size }, (_, r) =>
                            Array.from({ length: sudoku_size }, (_, c) => {
                                const found = given_numbers.find(item => item.row === r && item.col === c);
                                return found ? found.num : (is_blocked_cell(r, c) ? -1 : 0);
                            })
                        );
                    }
                }

                // 否则更新逻辑解并继续回溯
                // log_process(`  → 多解（${result.solution_count === -1 ? '2+' : result.solution_count}个），继续给数...`);
                if (state.logical_solution) {
                    for (let i = 0; i < sudoku_size; i++) {
                        for (let j = 0; j < sudoku_size; j++) {
                            if (Array.isArray(state.logical_solution[i][j])) {
                                sudoku_board[i][j] = [...state.logical_solution[i][j]];
                            } else {
                                sudoku_board[i][j] = state.logical_solution[i][j];
                            }
                        }
                    }
                }

                // 继续递归尝试下一个格子
                const solution = backtrack(cell_index + 1);
                if (solution) return solution;

                // 回溯失败，恢复状态
                log_process(`  → 深度回溯失败，撤销此次给数`);
                restore_original_board();
                sudoku_board[row][col] = candidates1;
                if (!(row === sym_row && col === sym_col)) sudoku_board[sym_row][sym_col] = candidates2;
                given_numbers.pop();
                if (!(row === sym_row && col === sym_col)) given_numbers.pop();
            }
        }

        return false;
    }

    const solution = backtrack();
    
    // 如果回溯成功找到了解，返回该解；否则返回 null
    if (solution) {
        // log_process(`题目盘面生成成功！`);
    } else {
        log_process(`题目盘面生成失败`);
    }
    return solution || null;
}

export function generate_solution_new(size) {
    const board = Array.from({ length: size }, () =>
        Array.from({ length: size }, () => 0)
    );

    const candidate_stack = [];

    let regions = get_all_regions(size, state.current_mode);
    const region_counts = Array.from({ length: size }, () => Array(size).fill(0));
    for (const region of regions) {
        for (const [r, c] of region.cells) {
            region_counts[r][c]++;
        }
    }

    let attempt_count = 0;
    const max_attempts_dom = document.getElementById('maxAttemptsInput');
    const max_attempts = max_attempts_dom && max_attempts_dom.value ? parseInt(max_attempts_dom.value) : 10000;

    if (!state.is_full_mark_mode) {
        try {
            const precheck_board = Array.from({ length: size }, () =>
                Array.from({ length: size }, () => 0)
            );
            solve(precheck_board, size, isValid, true);

            if (state.logical_solution) {
                for (let r = 0; r < size; r++) {
                    for (let c = 0; c < size; c++) {
                        const cell = state.logical_solution[r][c];
                        board[r][c] = Array.isArray(cell) ? [...cell] : cell;
                    }
                }
            }
        } catch (error) {
            log_process(`预检查候选失败，继续使用新终盘生成逻辑：${error.message}`);
        }
    }

    function clone_board(source_board) {
        return Array.from({ length: size }, (_, r) =>
            Array.from({ length: size }, (_, c) => {
                const cell = source_board[r][c];
                return Array.isArray(cell) ? [...cell] : cell;
            })
        );
    }

    function find_best_cell() {
        let best_cell = null;

        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const cell = board[row][col];
                if (cell === 0 || Array.isArray(cell)) {
                    const candidates = Array.isArray(cell)
                        ? [...cell]
                        : [...Array(size)].map((_, i) => i + 1).filter(n => isValid(board, size, row, col, n));

                    const region_count = region_counts[row][col];

                    if (
                        !best_cell ||
                        region_count > region_counts[best_cell.row][best_cell.col] ||
                        (
                            region_count === region_counts[best_cell.row][best_cell.col] &&
                            candidates.length < best_cell.candidates.length
                        )
                    ) {
                        best_cell = { row, col, candidates };
                    }
                }
            }
        }

        return best_cell;
    }

    function apply_solver_reduction() {
        const solver_board = clone_board(board);
        const result = solve(solver_board, size, isValid, true);

        if (!result || result.solution_count === 0 || result.solution_count === -2) {
            return false;
        }

        const reduced_board = Array.isArray(state.logical_solution) ? state.logical_solution : solver_board;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const cell = reduced_board[r][c];
                board[r][c] = Array.isArray(cell) ? [...cell] : cell;
            }
        }

        return true;
    }

    function backtrack() {
        if (++attempt_count > max_attempts) {
            return false;
        }

        const best_cell = find_best_cell();
        if (!best_cell) {
            return true;
        }

        const { row, col, candidates } = best_cell;

        for (const num of shuffle(candidates)) {
            if (!isValid(board, size, row, col, num)) {
                continue;
            }

            const board_backup = clone_board(board);
            candidate_stack.push(board_backup);

            board[row][col] = num;
            eliminate_candidates(board, size, row, col, num);

            if (!apply_solver_reduction()) {
                const previous_state = candidate_stack.pop();
                for (let r = 0; r < size; r++) {
                    for (let c = 0; c < size; c++) {
                        board[r][c] = previous_state[r][c];
                    }
                }
                continue;
            }

            if (backtrack()) {
                return true;
            }

            const previous_state = candidate_stack.pop();
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    board[r][c] = previous_state[r][c];
                }
            }
        }

        return false;
    }

    return backtrack() ? board : null;
}

export function generate_solution_old(size) {
    const board = Array.from({ length: size }, () =>
        Array.from({ length: size }, () => 0)
    );
    // const board_all = state.clues_board.map(row => [...row]);
    // for (let ir = 1; ir <= size; ir++) {
    //     for (let ic = 1; ic <= size; ic++) {
    //         // puzzle[ir][ic] = inner_puzzle[ir - 1][ic - 1];
    //         const val = board[ir - 1][ic - 1];
    //         // 如果是 0，则赋予全部候选数数组，否则赋予固定值
    //         board_all[ir][ic] = val === 0 
    //             ? Array.from({ length: size }, (_, i) => i + 1) 
    //             : val;
    //     }
    // }
    // const res = solve(board_all, size, isValid, true);
    // log_process(
    //     res.solution
    //         .map(row => row.map(cell => Array.isArray(cell) ? `[${cell.join(',')}]` : cell).join(' '))
    //         .join('\n')
    // );
    // log_process(`生成终盘完成size=${size}`);
    // return;

    // 用于存储每次调用 eliminate_candidates 前的候选数状态
    const candidate_stack = [];

    // 获取所有区域（宫、行、列 + 变型特定组合）
    let regions = get_all_regions(size, state.current_mode);
    // const special_regions = get_special_combination_regions(null, size, state.current_mode);
    // if (Array.isArray(special_regions) && special_regions.length > 0) {
    //     regions = regions.concat(special_regions);
    // }

    // 预计算每个格子所属的区域数量（供 find_best_cell 使用）
    const region_counts = Array.from({ length: size }, () => Array(size).fill(0));
    for (const region of regions) {
        for (const [r, c] of region.cells) {
            region_counts[r][c]++;
        }
    }

    let attempt_count = 0; // 新增回溯计数器
    const max_attempts_dom = document.getElementById('maxAttemptsInput');
    const max_attempts = max_attempts_dom && max_attempts_dom.value ? parseInt(max_attempts_dom.value) : 10000; // 最大尝试次数
    // const max_attempts = 100; // 最大尝试次数

    // 非全标类题型先静默检查一次当前盘面，刷新各格候选数后再进入原有终盘生成逻辑
    if (!state.is_full_mark_mode) {
        try {
            const precheck_board = Array.from({ length: size }, () =>
                Array.from({ length: size }, () => 0)
            );
            solve(precheck_board, size, isValid, true);

            if (state.logical_solution) {
                for (let r = 0; r < size; r++) {
                    for (let c = 0; c < size; c++) {
                        const cell = state.logical_solution[r][c];
                        board[r][c] = Array.isArray(cell) ? [...cell] : cell;
                    }
                }
            }
        } catch (error) {
            log_process(`预检查候选失败，继续使用原始生成逻辑：${error.message}`);
        }
    }

    // 检查某区域是否存在某个候选数只剩一格可填
    function check_unique_candidate_in_regions() {
        for (const region of regions) {
            const candidateCounts = Array.from({ length: size }, () => 0);
            const candidatePositions = Array.from({ length: size }, () => []);

            for (const [r, c] of region.cells) {
                if (board[r][c] === 0 || Array.isArray(board[r][c])) {
                    const candidates = Array.isArray(board[r][c])
                        ? [...board[r][c]]
                        : [...Array(size)].map((_, i) => i + 1).filter(n => isValid(board, size, r, c, n));
                    // const candidates = [...Array(size)].map((_, i) => i + 1).filter(n => isValid(board, size, r, c, n));
                    for (const candidate of candidates) {
                        candidateCounts[candidate - 1]++;
                        candidatePositions[candidate - 1].push([r, c]);
                    }
                }
            }

            for (let num = 0; num < size; num++) {
                if (candidateCounts[num] === 1) {
                    const [r, c] = candidatePositions[num][0];
                    board[r][c] = num + 1;
                    // log_process(`区域 ${region.type} ${region.index} 中数字 ${num + 1} 只能填在位置 [${r + 1}, ${c + 1}]`);
                    eliminate_candidates(board, size, r, c, num + 1);
                    return true; // 发现唯一候选数后立即返回
                }
            }
        }
        return false;
    }

    // // 找到候选数最少的空格
    // function find_best_cell() {
    //     let best_cell = null;
    
    //     for (let row = 0; row < size; row++) {
    //         for (let col = 0; col < size; col++) {
    //             if (board[row][col] === 0) {
    //                 const candidates = [...Array(size)]
    //                     .map((_, i) => i + 1)
    //                     .filter(n => isValid(board, size, row, col, n));
    
    //                 const region_count = region_counts[row][col];
    
    //                 if (
    //                     !best_cell ||
    //                     region_count > region_counts[best_cell.row][best_cell.col] ||
    //                     (
    //                         region_count === region_counts[best_cell.row][best_cell.col] &&
    //                         candidates.length < best_cell.candidates.length
    //                     )
    //                 ) {
    //                     best_cell = { row, col, candidates };
    //                 }
    //             }
    //         }
    //     }
    
    //     return best_cell;
    // }
        function find_best_cell() {
        let best_cell = null;
    
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const cell = board[row][col];
                if (cell === 0 || Array.isArray(cell)) {
                    const candidates = Array.isArray(cell)
                        ? [...cell]
                        : [...Array(size)].map((_, i) => i + 1).filter(n => isValid(board, size, row, col, n));
    
                    const region_count = region_counts[row][col];
    
                    if (
                        !best_cell ||
                        region_count > region_counts[best_cell.row][best_cell.col] ||
                        (
                            region_count === region_counts[best_cell.row][best_cell.col] &&
                            candidates.length < best_cell.candidates.length
                        )
                    ) {
                        best_cell = { row, col, candidates };
                    }
                }
            }
        }
        return best_cell;
    }

    // 回溯填充数字
    function backtrack() {
        if (++attempt_count > max_attempts) {
            // 超过上限直接返回失败
            return false;
        }
        const best_cell = find_best_cell();
        if (!best_cell) {
            // 如果没有空格，说明已经填满
            return true;
        }

        const { row, col, candidates } = best_cell;

        for (const num of shuffle(candidates)) {
            if (isValid(board, size, row, col, num)) {
                // 备份当前候选数状态
                const boardBackup = Array.from({ length: size }, () => Array(size));
                for (let r = 0; r < size; r++) {
                    for (let c = 0; c < size; c++) {
                        const cell = board[r][c];
                        boardBackup[r][c] = Array.isArray(cell) ? cell.slice() : cell;
                    }
                }
                candidate_stack.push(boardBackup);
                // const boardBackup = board.map(row => row.map(cell => (Array.isArray(cell) ? [...cell] : cell)));
                // candidate_stack.push(boardBackup);

                // 填入数字
                board[row][col] = num;

                // 输出当前填入的数字
                // log_process(`在位置 [${row + 1}, ${col + 1}] 填入数字 ${num}`);

                // 调用 eliminate_candidates 删除相关区域的候选数
                eliminate_candidates(board, size, row, col, num);

                // // 检查是否有唯一可填的格子
                // let progress = true;
                // while (progress) {
                //     progress = false;
                //     for (let r = 0; r < size; r++) {
                //         for (let c = 0; c < size; c++) {
                //                                         if (board[row][col] === 0 || Array.isArray(board[row][col])) {
                //                 const candidates = Array.isArray(board[row][col])
                //                     ? [...board[row][col]]
                //                     : [...Array(size)].map((_, i) => i + 1).filter(n => isValid(board, size, row, col, n));
                //                 if (candidates.length === 1) {
                //                     board[r][c] = candidates[0];
                //                     // log_process(`位置 [${r + 1}, ${c + 1}] 填入数字 ${candidates[0]}`);
                //                     eliminate_candidates(board, size, r, c, candidates[0]);
                //                     progress = true;
                //                 }
                //             }
                //         }
                //     }

                //     // 检查某区域是否存在某个候选数只剩一格可填
                //     if (check_unique_candidate_in_regions()) {
                //         progress = true;
                //     }
                // }
                                // 检查是否有唯一可填的格子
                let progress = true;
                while (progress) {
                    progress = false;
                    for (let r = 0; r < size; r++) {
                        for (let c = 0; c < size; c++) {
                            const cell = board[r][c];
                            if (cell === 0 || Array.isArray(cell)) {
                                const candidates = Array.isArray(cell)
                                    ? [...cell]
                                    : [...Array(size)].map((_, i) => i + 1).filter(n => isValid(board, size, r, c, n));
                                if (candidates.length === 1) {
                                    board[r][c] = candidates[0];
                                    eliminate_candidates(board, size, r, c, candidates[0]);
                                    progress = true;
                                }
                            }
                        }
                    }
                    if (check_unique_candidate_in_regions()) {
                        progress = true;
                    }
                }

                if (backtrack()) {
                    return true;
                }

                // 回溯时恢复候选数状态
                // log_process(`回溯：撤销位置 [${row + 1}, ${col + 1}] 的数字 ${num}`);
                const previousState = candidate_stack.pop();
                for (let r = 0; r < size; r++) {
                    for (let c = 0; c < size; c++) {
                        board[r][c] = previousState[r][c];
                    }
                }
            }
        }

        return false;
    }

    // backtrack();
    // return board; // 全部填完返回终盘
    // 修改这里：如果回溯失败，返回 null
    return backtrack() ? board : null;
}

// 备用方法：暴力生成终盘
export function generate_solved_board_brute_force(size) {
    // 这是一个简化的暴力生成方法，实际可能需要更复杂的实现
    const board = Array(size).fill().map(() => Array(size).fill(0));
    
    function backtrack(row, col) {
        if (row === size) return true;
        
        const nextCol = (col + 1) % size;
        const nextRow = nextCol === 0 ? row + 1 : row;
        
        const numbers = [...Array(size)].map((_, i) => i + 1);
        // 随机打乱数字顺序
        for (let i = numbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
        }
        const prev_mode = state.current_mode;
        const prev_is_full_mark_mode = state.is_full_mark_mode;
        state.current_mode = 'classic';
        state.is_full_mark_mode = false;
        try {
            for (const num of numbers) {
                if (isValid(board, size, row, col, num)) {
                    board[row][col] = num;
                    if (backtrack(nextRow, nextCol)) {
                        return true;
                    }
                    board[row][col] = 0;
                }
            }
        } finally {
            state.current_mode = prev_mode;
            state.is_full_mark_mode = prev_is_full_mark_mode;
        }
        return false;
    }
    
    return backtrack(0, 0) ? board : null;
}

// 挖洞，返回题目盘
function dig_holes(solution, size, _, symmetry = 'none', holes_limit = undefined, validation_options = {}) {
    const puzzle = solution.map(row => [...row]);
    const blocked_cell_keys = new Set();
    const blocked_positions = [];
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (puzzle[r][c] === -1) {
                blocked_cell_keys.add(`${r},${c}`);
                blocked_positions.push([r, c]);
            }
        }
    }
    const is_blocked_cell = (row, col) => blocked_cell_keys.has(`${row},${col}`);
    let holes_dug = 0;
    let changed;

    // 在这些模式下跳过分值比较，直接以唯一解为准进行挖洞
    const SKIP_SCORE_MODES = new Set(['VX', 'kropki', 'consecutive', 'X_sums', 'sandwich', 'skyscraper', 'pyramid']);
    const validation_mode = validation_options?.mode === 'check_next' ? 'check_next' : 'uniqueness';
    const stop_on_single_progress = validation_options?.stopOnSingleProgress === true;
    const single_progress_check_mode = validation_options?.singleProgressCheckMode === 'check_next' ? 'check_next' : 'uniqueness';
    const is_bordered_mode = state.current_mode === 'X_sums' || state.current_mode === 'sandwich' || state.current_mode === 'skyscraper' || state.current_mode === 'rossini';
    const skipScore = SKIP_SCORE_MODES.has(state.current_mode) || validation_mode === 'check_next';

    const build_test_board_from_puzzle = () => {
        if (is_bordered_mode) {
            return Array.from({ length: size + 2 }, (_, i) =>
                Array.from({ length: size + 2 }, (_, j) => {
                    if (i === 0 || i === size + 1 || j === 0 || j === size + 1) {
                        return 0;
                    }
                    const cell = puzzle[i - 1][j - 1];
                    return cell === -1
                        ? -1
                        : cell === 0
                        ? [...Array(size)].map((_, n) => n + 1)
                        : cell;
                })
            );
        }

        return puzzle.map((row) =>
            row.map((cell) => cell === -1
                ? -1
                : cell === 0
                ? [...Array(size)].map((_, n) => n + 1)
                : cell)
        );
    };

    const count_determined_numbers = (board) => {
        if (!Array.isArray(board)) {
            return 0;
        }

        let count = 0;
        if (is_bordered_mode) {
            state.clues_board = Array.from({ length: size + 2 }, (_, i) =>
                Array.from({ length: size + 2 }, (_, j) => {
                    const isBorder = i === 0 || i === size + 1 || j === 0 || j === size + 1;
                    if (isBorder) {
                        const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
                        const valStr = (input?.value ?? '').trim();
                        if (state.is_candidates_mode && valStr.length > 1) {
                            return [...new Set(valStr.split('').map(Number))].filter(n => n >= 1 && n <= size);
                        }
                        if (valStr === '') return null;
                        if (state.current_mode === 'rossini') {
                            const arrowSet = new Set(['↑', '↓', '←', '→']);
                            return arrowSet.has(valStr) ? valStr : null;
                        }
                        const v = parseInt(valStr, 10);
                        return Number.isFinite(v) ? v : null;
                    }
                    return Array.from({ length: size }, (_, n) => n + 1);
                })
            );

            for (let i = 1; i <= size; i++) {
                for (let j = 1; j <= size; j++) {
                    if (typeof board[i]?.[j] === 'number' && board[i][j] > 0) {
                        count++;
                    }
                }
            }
            return count;
        }

        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (typeof board[i]?.[j] === 'number' && board[i][j] > 0) {
                    count++;
                }
            }
        }
        return count;
    };

    const prepare_preview_solver_state = (check_next = false) => {
        state.check_next = check_next;
        state.candidate_elimination_score = {};
        state.total_score_sum = 0;
        state.logical_solution = null;
        state.implicit_collect_enabled = false;
        state.implicit_trail = [];
        state.implicit_last_application = null;
        state.implicit_replay_active = false;
        state.implicit_expected_trail = [];
        state.implicit_replay_cursor = 0;
        state.implicit_replay_ok = true;
        state.implicit_current_replay_target = null;
    };

    const cleanup_preview_solver_state = () => {
        state.check_next = false;
        state.logical_solution = null;
        state.implicit_collect_enabled = false;
        state.implicit_trail = [];
        state.implicit_last_application = null;
        state.implicit_replay_active = false;
        state.implicit_expected_trail = [];
        state.implicit_replay_cursor = 0;
        state.implicit_replay_ok = true;
        state.implicit_current_replay_target = null;
    };

    const validate_candidate = () => {
        const test_board = build_test_board_from_puzzle();

        if (validation_mode === 'check_next') {
            const determined_before = count_determined_numbers(test_board);
            prepare_preview_solver_state(true);
            solve(test_board, size, isValid, true);
            const logical_board = Array.isArray(state.logical_solution) ? state.logical_solution : test_board;
            const determined_after = count_determined_numbers(logical_board);
            const current_score = state.solve_stats.total_score !== undefined ? state.solve_stats.total_score : -1;
            cleanup_preview_solver_state();
            return {
                is_valid: determined_after > determined_before,
                score: current_score
            };
        }

        prepare_preview_solver_state(false);
        solve(test_board, size, isValid, true);
        const is_valid = state.solve_stats.solution_count === 1;
        const current_score = state.solve_stats.total_score !== undefined ? state.solve_stats.total_score : -1;
        cleanup_preview_solver_state();
        return {
            is_valid,
            score: current_score
        };
    };

    const should_stop_after_single_progress = () => {
        if (!stop_on_single_progress) {
            return false;
        }

        const test_board = build_test_board_from_puzzle();
        const determined_before = count_determined_numbers(test_board);
        prepare_preview_solver_state(single_progress_check_mode === 'check_next');
        solve(test_board, size, isValid, true);
        const logical_board = Array.isArray(state.logical_solution) ? state.logical_solution : test_board;
        const determined_after = count_determined_numbers(logical_board);
        cleanup_preview_solver_state();
        return determined_after - determined_before === 1;
    };

    // 获取所有区域并计算每个格子所属的区域数量
    let regions = get_all_regions(size, state.current_mode);
    // 如果是反对角线模式，仅返回两条对角线区域
    if (state.current_mode === 'anti_diagonal') {
        const diag1_cells = [];
        const diag2_cells = [];
        for (let i = 0; i < size; i++) {
            diag1_cells.push([i, i]);
            diag2_cells.push([i, size - 1 - i]);
        }
        regions = [
            { type: '对角线', index: 1, cells: diag1_cells },
            { type: '对角线', index: 2, cells: diag2_cells }
        ];
    // } else if (state.current_mode === 'pyramid') {
    //     regions = [
    //     ];
    }
    const special_regions = get_special_combination_regions(null, size, state.current_mode);
    if (Array.isArray(special_regions) && special_regions.length > 0) {
        regions = regions.concat(special_regions);
    }
    const region_counts = Array.from({ length: size }, () => Array(size).fill(0));
    for (const region of regions) {
        for (const [r, c] of region.cells) {
            region_counts[r][c]++;
        }
    }

    // 与缺一门生成一致：先按黑格触发一次对称预挖
    if (blocked_positions.length > 0) {
        const already_dug = new Set();
        for (const [row, col] of blocked_positions) {
            if (holes_limit !== undefined && holes_dug >= holes_limit) break;

            const symmetric_positions = get_symmetric_positions(row, col, size, symmetry)
                .filter(([sr, sc]) => !is_blocked_cell(sr, sc));

            for (const [sr, sc] of symmetric_positions) {
                if (holes_limit !== undefined && holes_dug >= holes_limit) break;

                const key = `${sr},${sc}`;
                if (already_dug.has(key) || puzzle[sr][sc] === 0) continue;

                puzzle[sr][sc] = 0;
                already_dug.add(key);
                holes_dug++;
            }
        }
    }

    do {
        if (holes_limit !== undefined && holes_dug >= holes_limit) break; // 挖洞数量达到上限，停止

        changed = false;
        let best_region_count = -1;
        let best_score = -1;
        let best_candidates = []; // 用于存储所有最高分或最优区域方案

        // 遍历所有可挖位置，寻找最优方案
        for (let pos = 0; pos < size * size; pos++) {
            let row = Math.floor(pos / size);
            let col = pos % size;
            if (puzzle[row][col] === 0 || is_blocked_cell(row, col)) continue;

            const symmetric_positions = get_symmetric_positions(row, col, size, symmetry)
                .filter(([sr, sc]) => !is_blocked_cell(sr, sc));
            const positions_to_dig = [ [row, col], ...symmetric_positions ];

            // 跳过已挖过的格子
            if (positions_to_dig.some(([r, c]) => puzzle[r][c] === 0 || is_blocked_cell(r, c))) continue;

            // 临时保存所有位置的数字
            const temp_values = positions_to_dig.map(([r, c]) => puzzle[r][c]);

            // 预挖洞
            positions_to_dig.forEach(([r, c]) => puzzle[r][c] = 0);

            const { is_valid, score: current_score } = validate_candidate();

            // 只要通过当前预挖校验即可作为候选；是否比较分值由 skipScore 控制
            if (is_valid) {
                const current_region_count = Math.max(...positions_to_dig.map(([r, c]) => region_counts[r][c]));

                if (skipScore) {
                    // 仅按区域数量优先选择，若相同则随机收集
                    if (current_region_count > best_region_count) {
                        best_region_count = current_region_count;
                        best_score = -1;
                        best_candidates = [{
                            positions: positions_to_dig.map(([r, c]) => [r, c]),
                            temp_values: [...temp_values],
                            region_count: current_region_count,
                            score: current_score
                        }];
                    } else if (current_region_count === best_region_count) {
                        best_candidates.push({
                            positions: positions_to_dig.map(([r, c]) => [r, c]),
                            temp_values: [...temp_values],
                            region_count: current_region_count,
                            score: current_score
                        });
                    }
                } else {
                    // 原逻辑：先比较区域数量，再比较分值
                    if (current_region_count > best_region_count) {
                        best_region_count = current_region_count;
                        best_score = current_score;
                        best_candidates = [{
                            positions: positions_to_dig.map(([r, c]) => [r, c]),
                            temp_values: [...temp_values],
                            region_count: current_region_count,
                            score: current_score
                        }];
                    } else if (current_region_count === best_region_count) {
                        if (current_score > best_score) {
                            best_score = current_score;
                            best_candidates = [{
                                positions: positions_to_dig.map(([r, c]) => [r, c]),
                                temp_values: [...temp_values],
                                region_count: current_region_count,
                                score: current_score
                            }];
                        } else if (current_score === best_score) {
                            best_candidates.push({
                                positions: positions_to_dig.map(([r, c]) => [r, c]),
                                temp_values: [...temp_values],
                                region_count: current_region_count,
                                score: current_score
                            });
                        }
                    }
                }
            }

            // 恢复数字
            positions_to_dig.forEach(([r, c], idx) => puzzle[r][c] = temp_values[idx]);
        }

        // 如果本轮有最优挖洞方案，则随机选择一个实际挖洞
        if (best_candidates.length > 0) {
            const chosen = best_candidates[Math.floor(Math.random() * best_candidates.length)];
            const group_size = chosen.positions.length;
            if (holes_limit !== undefined && holes_dug + group_size > holes_limit) {
                break;
            }
            chosen.positions.forEach(([r, c]) => puzzle[r][c] = 0);
            holes_dug += group_size;
            changed = group_size > 0;
            if (changed && should_stop_after_single_progress()) {
                break;
            }
        }
    } while (changed && (holes_limit === undefined || holes_dug < holes_limit));

    return puzzle;
}


function solve_with_minimal_uniqueness_profile(test_board, size) {
    const baseline = run_solve_with_implicit_control(clone_solver_board(test_board), size, {
        collect_implicit: true
    });

    if (!baseline?.solve_result || baseline.solve_result.solution_count === -2 || baseline.solve_result.solution_count === 0) {
        return baseline?.solve_result;
    }

    const original_trail = Array.isArray(baseline.implicit_trail) ? baseline.implicit_trail : [];
    if (original_trail.length === 0) {
        return baseline.solve_result;
    }

    let minimal_trail = original_trail.slice();

    for (let idx = minimal_trail.length - 1; idx >= 0; idx--) {
        const candidate_trail = minimal_trail.filter((_, i) => i !== idx);
        const replay_result = run_solve_with_implicit_control(clone_solver_board(test_board), size, {
            replay_trail: candidate_trail
        });

        if (replay_result.implicit_replay_ok && replay_result.result_signature === baseline.result_signature) {
            minimal_trail = candidate_trail;
        }
    }

    const applied_result = run_solve_with_implicit_control(clone_solver_board(test_board), size, {
        replay_trail: minimal_trail,
        collect_implicit: true
    });

    if (!applied_result.implicit_replay_ok || applied_result.result_signature !== baseline.result_signature) {
        state.solve_stats.solution_count = baseline.solve_result.solution_count;
        state.solve_stats.technique_counts = baseline.solve_result.technique_counts || {};
        state.solve_stats.total_score = baseline.solve_result.total_score || 0;
        return baseline.solve_result;
    }

    return applied_result.solve_result;
    
    function clone_solver_board(board) {
        if (!Array.isArray(board)) return [];
        return board.map((row) =>
            Array.isArray(row)
                ? row.map((cell) => (Array.isArray(cell) ? [...cell] : cell))
                : []
        );
    }

    function normalize_implicit_numbers(numbers) {
        if (!Array.isArray(numbers)) return undefined;
        return [...new Set(
            numbers
                .map((n) => Number(n))
                .filter((n) => Number.isFinite(n))
        )].sort((a, b) => a - b);
    }

    function normalize_implicit_trail_entry(entry) {
        const payload = entry?.payload && typeof entry.payload === 'object'
            ? {
                ...entry.payload,
                numbers: normalize_implicit_numbers(entry.payload.numbers)
            }
            : null;
        return {
            technique: entry?.technique,
            score_key: entry?.score_key,
            nat: entry?.nat,
            payload
        };
    }

    function build_result_signature(size, solution_count, logical_solution) {
        const solution_signature = Array.isArray(logical_solution)
            ? logical_solution
                .slice(0, size)
                .map((row) => {
                    if (!Array.isArray(row)) {
                        return '0'.repeat(size);
                    }
                    return row
                        .slice(0, size)
                        .map((cell) => (typeof cell === 'number' && cell > 0 ? String(cell) : '0'))
                        .join('');
                })
                .join('|')
            : '';

        return `${solution_count}|${solution_signature}`;
    }

    function run_solve_with_implicit_control(board, size, options = {}) {
        const collect_implicit = options.collect_implicit === true;
        const replay_trail = Array.isArray(options.replay_trail) ? options.replay_trail : null;

        state.candidate_elimination_score = {};
        state.total_score_sum = 0;
        state.logical_solution = null;

        state.implicit_collect_enabled = collect_implicit;
        state.implicit_trail = [];
        state.implicit_last_application = null;
        state.implicit_replay_active = Array.isArray(replay_trail);
        state.implicit_expected_trail = state.implicit_replay_active
            ? replay_trail.map((entry) => normalize_implicit_trail_entry(entry))
            : [];
        state.implicit_replay_cursor = 0;
        state.implicit_replay_ok = true;

        const solve_result = solve(board, size, isValid, true);

        if (state.implicit_replay_active) {
            const expected_len = state.implicit_expected_trail.length;
            if (state.implicit_replay_cursor !== expected_len) {
                state.implicit_replay_ok = false;
            }
            if (solve_result?.implicit_replay_ok === false) {
                state.implicit_replay_ok = false;
            }
        }

        const implicit_trail = (Array.isArray(state.implicit_trail) ? state.implicit_trail : [])
            .map((entry) => normalize_implicit_trail_entry(entry));

        const result_signature = build_result_signature(
            size,
            state.solve_stats.solution_count,
            state.logical_solution
        );
        const implicit_replay_ok = state.implicit_replay_ok !== false;

        state.implicit_collect_enabled = false;
        state.implicit_replay_active = false;
        state.implicit_expected_trail = [];
        state.implicit_replay_cursor = 0;
        state.implicit_last_application = null;
        state.implicit_current_replay_target = null;

        return {
            solve_result,
            implicit_trail,
            implicit_replay_ok,
            result_signature
        };
    }
}

// 获取对称位置
export function get_symmetric_positions(row, col, size, symmetry) {
    const positions = [];
    const center = (size - 1) / 2;
    
    switch(symmetry) {
        case 'horizontal':
            if (row !== size - 1 - row) {
                positions.push([size - 1 - row, col]);
            }
            break;
        case 'vertical':
            if (col !== size - 1 - col) {
                positions.push([row, size - 1 - col]);
            }
            break;
        case 'central':
            if (row !== size - 1 - row || col !== size - 1 - col) {
                positions.push([size - 1 - row, size - 1 - col]);
            }
            break;
        case 'diagonal':
            if (row !== col) {
                positions.push([col, row]);
            }
            break;
        case 'anti-diagonal':
            if (row + col !== size - 1) {
                positions.push([size - 1 - col, size - 1 - row]);
            }
            break;
        case 'none':
            // 不对称模式，不添加任何对称位置
            break;
    }
    
    return positions;
}

export function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 中心对称概率最高，其次对角线/反对角线，再其次水平/垂直，最后不对称
const SYMMETRY_TYPES = [
    'central','central','central','central','central',
    'diagonal','diagonal',
    'anti-diagonal','anti-diagonal',
    'horizontal',
    'vertical',
    // 'none'
];

/**
 * 将生成的题目填充到网格
 */
export function fill_puzzle_to_grid(puzzle) {
    const container = document.querySelector('.sudoku-container');
    const size = puzzle.length;
    
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const row = isBorderedMode ? i + 1 : i;
            const col = isBorderedMode ? j + 1 : j;
            const input = container.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
            if (input) {
                input.value = puzzle[i][j] || '';
            }
        }
    }
    
    backup_original_board();
    show_result(`已生成${size}宫格数独题目`);
}