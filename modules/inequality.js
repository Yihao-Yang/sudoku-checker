import { state, set_current_mode } from '../solver/state.js';
import { show_result, log_process, bold_border, create_base_grid, backup_original_board, restore_original_board, handle_key_navigation, create_base_cell, add_Extra_Button, clear_all_inputs, clear_marks } from '../solver/core.js';
import { create_technique_panel } from '../solver/classic.js';
import { get_all_regions, solve, invalidate_regions_cache } from '../solver/solver_tool.js';
import { generate_solved_board_brute_force, shuffle, generate_puzzle } from '../solver/generate.js';
// modules/inequality.js (add near top)
const INEQUALITY_MARK_SELECTOR = '.vx-mark[data-key]';

function invalidateInequalityConstraints() {
    state._inequalityConstraintCache = null;
}

function getInequalityConstraintMap(size) {
    const container = document.querySelector('.sudoku-container');
    const marks = container ? container.querySelectorAll(INEQUALITY_MARK_SELECTOR) : [];
    const markCount = marks.length;
    const cached = state._inequalityConstraintCache;

    if (cached && cached.size === size && cached.count === markCount) {
        return cached.map;
    }

    const map = new Map();
    const addConstraint = (row, col, constraint) => {
        const key = `${row},${col}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(constraint);
    };

    for (const mark of marks) {
        const key = mark.dataset.key;
        if (!key) continue;

        let cellA, cellB;
        if (key.startsWith('v-')) {
            const parts = key.split('-');
            const row = Number(parts[1]);
            const col = Number(parts[2]) - 1;
            if (!Number.isInteger(row) || !Number.isInteger(col)) continue;
            if (col < 0 || col + 1 >= size) continue;
            cellA = [row, col];
            cellB = [row, col + 1];
        } else if (key.startsWith('h-')) {
            const parts = key.split('-');
            const row = Number(parts[1]) - 1;
            const col = Number(parts[2]);
            if (!Number.isInteger(row) || !Number.isInteger(col)) continue;
            if (row < 0 || row + 1 >= size) continue;
            cellA = [row, col];
            cellB = [row + 1, col];
        } else {
            continue;
        }

        const [aRow, aCol] = cellA;
        const [bRow, bCol] = cellB;

        const symbolDiv = mark.querySelector('div');
        if (symbolDiv) {
            const symbol = symbolDiv.textContent.trim();
            if (symbol === '>' || symbol === '<') {
                addConstraint(aRow, aCol, { type: 'compare', otherRow: bRow, otherCol: bCol, relation: symbol });
                addConstraint(bRow, bCol, { type: 'compare', otherRow: aRow, otherCol: aCol, relation: symbol === '>' ? '<' : '>' });
            }
            continue;
        }

        const input = mark.querySelector('input');
        const value = input?.value.trim();
        const match = value && value.match(/^(\d+)\s*\/\s*(\d+)$/);
        if (match) {
            const left = Number(match[1]);
            const right = Number(match[2]);
            if (left > 0 && right > 0) {
                const constraint = { type: 'ratio', otherRow: bRow, otherCol: bCol, left, right };
                addConstraint(aRow, aCol, constraint);
                addConstraint(bRow, bCol, constraint);
            }
        }
    }

    state._inequalityConstraintCache = { size, count: markCount, map };
    return map;
}
// 新数独主入口
export function create_inequality_sudoku(size) {
    set_current_mode('inequality');
    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');
    state.current_grid_size = size;
    invalidate_regions_cache();

    // 技巧设置（可根据需要调整）
    state.techniqueSettings = {
        Box_Elimination: true,
        Row_Col_Elimination: true,
        Box_Block: true,
        Box_Pair_Block: true,
        Row_Col_Block: true,
        Box_Naked_Pair: true,
        Row_Col_Naked_Pair: true,
        Box_Hidden_Pair: true,
        Row_Col_Hidden_Pair: true,
        Box_Naked_Triple: true,
        Row_Col_Naked_Triple: true,
        Box_Hidden_Triple: true,
        Row_Col_Hidden_Triple: true,
        All_Quad: false,
        Cell_Elimination: true,
        Brute_Force: false,
        Special_Combination_Region_Elimination_1: true,
        Special_Combination_Region_Elimination_2: true,
        Special_Combination_Region_Elimination_3: true,
        Multi_Special_Combination_Region_Elimination_1: true,
        Multi_Special_Combination_Region_Elimination_2: true,
        Multi_Special_Combination_Region_Elimination_3: true,
        Special_Combination_Region_Block_1: true,
        Special_Combination_Region_Block_2: true,
        Special_Combination_Region_Block_3: true,
        Multi_Special_Combination_Region_Block_1: true,
        Multi_Special_Combination_Region_Block_2: true,
        Multi_Special_Combination_Region_Block_3: true,
    };
    for (let i = 1; i <= size; i++) {
        state.techniqueSettings[`Cell_Elimination_${i}`] = true;
    }

    create_technique_panel();

    const { container, grid } = create_base_grid(size);
    const inputs = Array.from({ length: size }, () => new Array(size));

    for (let i = 0; i < size * size; i++) {
        const row = Math.floor(i / size);
        const col = i % size;

        const { cell, main_input, candidates_grid } = create_base_cell(row, col, size);

        cell.appendChild(main_input);
        cell.appendChild(candidates_grid);
        grid.appendChild(cell);
        inputs[row][col] = main_input;

        main_input.addEventListener('input', function() {
            const max_value = size;
            const regex = new RegExp(`[^1-${max_value}]`, 'g');
            this.value = this.value.replace(regex, '');
            if (this.value.length > 1) {
                this.value = this.value[this.value.length - 1];
            }
        });

        main_input.addEventListener('keydown', function(e) {
            handle_key_navigation(e, row, col, size, inputs);
        });

        bold_border(cell, row, col, size);
    }

    container.appendChild(grid);
    gridDisplay.appendChild(container);

    // 添加标记功能
    add_inequality_mark(size);

    // 添加新数独专属按钮
    const extra_buttons = document.getElementById('extraButtons');
    extra_buttons.innerHTML = '';
    add_Extra_Button('清除标记', clear_marks);
    add_Extra_Button('自动出题', () => generate_inequality_puzzle(size), '#2196F3');
    // 可添加唯一性验证等按钮
}

// 自动生成不等号数独题目（生成圆圈并调用generate_puzzle）
export function generate_inequality_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    const start_time = performance.now();
    clear_all_inputs();
    log_process('', true);
    invalidate_regions_cache();

    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    Array.from(container.querySelectorAll('.vx-mark')).forEach(mark => mark.remove());

    log_process('第一步：生成不等号数独终盘...');
    const solvedBoard = generate_solved_board_brute_force(size);
    if (!solvedBoard) {
        log_process('生成终盘失败！');
        return;
    }

    log_process('第二步：开始添加对称不等号标记...');
    const SYMMETRY_TYPES = [
        'central','central','central','central','central',
        'diagonal','diagonal',
        'anti-diagonal','anti-diagonal',
        'horizontal',
        'vertical'
    ];
    const symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];
    log_process(`使用对称类型: ${symmetry}`);

    const MAX_MARKS = size * (size - 1);
    const MAX_TRY = 200;

    let marks_added = 0;
    let try_count = 0;

    // 添加不等号标记，直到达到唯一解
    while (try_count < MAX_TRY && marks_added < MAX_MARKS) {
        try_count++;

        const type = Math.random() < 0.5 ? 'v' : 'h';
        const row = type === 'v' ? Math.floor(Math.random() * size) : Math.floor(Math.random() * (size - 1));
        const col = type === 'v' ? Math.floor(Math.random() * (size - 1)) : Math.floor(Math.random() * size);

        if (!is_valid_position(row, col, size, type)) continue;

        const [sym_row, sym_col, sym_type] = get_symmetric(row, col, size, symmetry, type);
        if (!is_valid_position(sym_row, sym_col, size, sym_type)) continue;

        if (is_mark_exists(row, col, type, container) || is_mark_exists(sym_row, sym_col, sym_type, container)) {
            continue;
        }

        const addedMarks = [];
        const maininequality = calculate_inequality_from_solved(row, col, type, solvedBoard);
        if (!maininequality) continue;

        const mainMark = add_inequality_mark_with_value(row, col, size, container, type, maininequality);
        if (!mainMark) continue;
        addedMarks.push(mainMark);

        const symmetric_is_same = row === sym_row && col === sym_col && type === sym_type;
        if (!symmetric_is_same) {
            const syminequality = calculate_inequality_from_solved(sym_row, sym_col, sym_type, solvedBoard);
            if (!syminequality) {
                remove_marks(addedMarks);
                continue;
            }
            const symMark = add_inequality_mark_with_value(sym_row, sym_col, size, container, sym_type, syminequality);
            if (!symMark) {
                remove_marks(addedMarks);
                continue;
            }
            addedMarks.push(symMark);
        }

        marks_added += addedMarks.length;

        // 检查唯一性
        backup_original_board();
        const result = solve(create_solver_board(size), size, is_valid_inequality, true);
        restore_original_board();

        if (result.solution_count === 1) {
            log_process(`✓ 通过标记达到唯一解！共添加 ${marks_added} 个标记`);
            break;
        }

        if (result.solution_count === 0 || result.solution_count === -2) {
            log_process('✗ 无解，移除最后添加的标记');
            remove_marks(addedMarks);
            marks_added -= addedMarks.length;
        } else {
            log_process(`当前解数：${result.solution_count}，继续添加标记...`);
        }
    }

    // 第二步：调用 generate_puzzle 函数出题
    log_process('第三步：调用标准出题流程生成题目...');
    const puzzle_result = generate_puzzle(size, score_lower_limit, holes_count, solvedBoard);
    
    if (!puzzle_result) {
        log_process('出题失败！');
        return;
    }

    // 第三步：优化删除多余的不等号标记
    log_process('第四步：开始优化删除多余的不等号标记...');
    optimize_marks(container, size, symmetry);

    const elapsed = ((performance.now() - start_time) / 1000).toFixed(3);
    show_result(`不等号数独出题完成（耗时${elapsed}秒）`);

    // ==================== 内部函数定义 ====================
    
    function create_solver_board(size) {
        return Array.from({ length: size }, () =>
            Array.from({ length: size }, () => [...Array(size)].map((_, n) => n + 1))
        );
    }

    function remove_marks(list) {
        for (const mark of list) {
            if (mark && mark.parentNode) {
                mark.remove();
            }
        }
    }

    function get_mark_key(row, col, type) {
        return type === 'v' ? `v-${row}-${col + 1}` : `h-${row + 1}-${col}`;
    }

    function is_mark_exists(row, col, type, container) {
        const key = get_mark_key(row, col, type);
        return !!container.querySelector(`.vx-mark[data-key="${key}"]`);
    }

    function is_valid_position(row, col, size, type) {
        if (type === 'v') {
            return row >= 0 && row < size && col >= 0 && col < size - 1;
        }
        return row >= 0 && row < size - 1 && col >= 0 && col < size;
    }

    function get_symmetric(row, col, size, symmetry, type) {
        switch (symmetry) {
            case 'central':
                return type === 'v'
                    ? [size - 1 - row, size - 2 - col, 'v']
                    : [size - 2 - row, size - 1 - col, 'h'];
            case 'diagonal':
                return type === 'v'
                    ? [col, row, 'h']
                    : [col, row, 'v'];
            case 'anti-diagonal':
                return type === 'v'
                    ? [size - 2 - col, size - 1 - row, 'h']
                    : [size - 1 - col, size - 2 - row, 'v'];
            case 'horizontal':
                return type === 'v'
                    ? [size - 1 - row, col, 'v']
                    : [size - 2 - row, col, 'h'];
            case 'vertical':
                return type === 'v'
                    ? [row, size - 2 - col, 'v']
                    : [row, size - 1 - col, 'h'];
            default:
                return [row, col, type];
        }
    }

    function get_symmetric_position(row, col, size, symmetry) {
        switch (symmetry) {
            case 'central':
                return [size - 1 - row, size - 1 - col];
            case 'diagonal':
                return [col, row];
            case 'anti-diagonal':
                return [size - 1 - col, size - 1 - row];
            case 'horizontal':
                return [size - 1 - row, col];
            case 'vertical':
                return [row, size - 1 - col];
            default:
                return [row, col];
        }
    }

    function calculate_inequality_from_solved(row, col, type, solvedBoard) {
        let a, b;
        if (type === 'v') {
            a = solvedBoard[row]?.[col];
            b = solvedBoard[row]?.[col + 1];
        } else {
            a = solvedBoard[row]?.[col];
            b = solvedBoard[row + 1]?.[col];
        }
        if (!a || !b) return null;
        if (a === b) return null;
        return a < b ? '<' : '>';
    }

    function add_inequality_mark_with_value(row, col, size, container, type, symbol) {
        const grid = container.querySelector('.sudoku-grid');
        if (!grid) return null;

        const cell_width = grid.offsetWidth / size;
        const cell_height = grid.offsetHeight / size;

        let mark_x, mark_y, key, direction;
        if (type === 'v') {
            mark_x = (col + 1) * cell_width;
            mark_y = row * cell_height + cell_height / 2;
            key = get_mark_key(row, col, type);
            direction = 'horizontal';
        } else {
            mark_x = col * cell_width + cell_width / 2;
            mark_y = (row + 1) * cell_height;
            key = get_mark_key(row, col, type);
            direction = 'vertical';
        }

        const grid_offset_left = grid.offsetLeft;
        const grid_offset_top = grid.offsetTop;

        const mark = document.createElement('div');
        mark.className = 'vx-mark';
        mark.dataset.key = key;
        mark.style.position = 'absolute';
        mark.style.left = `${grid_offset_left + mark_x - 10}px`;
        mark.style.top = `${grid_offset_top + mark_y - 10}px`;
        mark.style.width = '20px';
        mark.style.height = '20px';
        mark.style.display = 'flex';
        mark.style.alignItems = 'center';
        mark.style.justifyContent = 'center';
        mark.style.fontSize = '24px';
        mark.style.color = '#333';
        mark.style.userSelect = 'none';
        mark.style.cursor = 'pointer';

        const symbolDiv = document.createElement('div');
        symbolDiv.textContent = symbol;
        if (direction === 'vertical') {
            symbolDiv.style.transform = 'rotate(90deg)';
        }

        mark.appendChild(symbolDiv);

        // 切换标记的函数：> → < → 删除
        const toggleMark = function() {
            if (symbolDiv.textContent === '>') {
                symbolDiv.textContent = '<';
            } else {
                mark.remove();
            }
        };

        // 单击切换标记状态
        mark.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleMark();
        });

        // 双击直接删除
        mark.ondblclick = function(e) {
            e.stopPropagation();
            mark.remove();
        };

        container.appendChild(mark);
        return mark;
    }

    function optimize_marks(container, size, symmetry) {
        log_process('开始最小化删除多余标记...');
        const groups = group_marks_by_symmetry(container, size, symmetry);
        let removed = 0;
        for (const group of groups) {
            const removedMarks = temporarily_remove_marks(container, group.keys);
            
            // 关键改动：创建当前棋盘状态，而不是空棋盘
            const currentBoard = Array.from({ length: size }, (_, r) =>
                Array.from({ length: size }, (_, c) => {
                    const input = document.querySelector(`.sudoku-grid input[data-row="${r}"][data-col="${c}"]`);
                    return input && input.value ? parseInt(input.value) : 0;
                })
            );
            
            backup_original_board();
            // 使用当前棋盘状态进行唯一性检测
            const result = solve(currentBoard, size, is_valid_inequality, true);
            restore_original_board();
            
            if (result.solution_count === 1) {
                permanently_remove_marks(removedMarks);
                removed += removedMarks.length;
                log_process(`删除标记组 [${group.keys.join(', ')}]，仍保持唯一解`);
            } else {
                restore_marks(container, removedMarks);
                log_process(`标记组 [${group.keys.join(', ')}] 对唯一性有贡献，保留`);
            }
        }
        log_process(`标记优化完成，共删除 ${removed} 个多余标记`);
    }

    function group_marks_by_symmetry(container, size, symmetry) {
        const marks = Array.from(container.querySelectorAll('.vx-mark[data-key]'))
            .filter(m => /^v-/.test(m.dataset.key) || /^h-/.test(m.dataset.key));
        const groups = [];
        const visited = new Set();
        for (const mark of marks) {
            const key = mark.dataset.key;
            if (visited.has(key)) continue;
            const [type, rowStr, colStr] = key.split('-');
            let baseRow, baseCol, baseType;
            if (type === 'v') {
                baseRow = parseInt(rowStr, 10);
                baseCol = parseInt(colStr, 10) - 1;
                baseType = 'v';
            } else {
                baseRow = parseInt(rowStr, 10) - 1;
                baseCol = parseInt(colStr, 10);
                baseType = 'h';
            }
            const [symRow, symCol, symType] = get_symmetric(baseRow, baseCol, size, symmetry, baseType);
            if (!is_valid_position(symRow, symCol, size, symType)) {
                groups.push({ keys: [key] });
                visited.add(key);
                continue;
            }
            const symKey = get_mark_key(symRow, symCol, symType);
            if (symKey && symKey !== key && marks.some(m => m.dataset.key === symKey) && !visited.has(symKey)) {
                groups.push({ keys: [key, symKey] });
                visited.add(symKey);
            } else {
                groups.push({ keys: [key] });
            }
            visited.add(key);
        }
        return groups;
    }

    function temporarily_remove_marks(container, keys = []) {
        const removed = [];
        for (const key of keys.filter(Boolean)) {
            const mark = container.querySelector(`.vx-mark[data-key="${key}"]`);
            if (!mark) continue;
            const placeholder = document.createElement('div');
            placeholder.style.display = 'none';
            placeholder.className = 'vx-mark-placeholder';
            mark.parentNode.insertBefore(placeholder, mark);
            removed.push({ element: mark, placeholder });
            mark.remove();
        }
        return removed;
    }

    function restore_marks(container, removedMarks) {
        for (const info of removedMarks) {
            if (info.placeholder && info.placeholder.parentNode) {
                info.placeholder.parentNode.replaceChild(info.element, info.placeholder);
            }
        }
    }

    function permanently_remove_marks(removedMarks) {
        for (const info of removedMarks) {
            if (info.placeholder && info.placeholder.parentNode) {
                info.placeholder.remove();
            }
        }
    }
}

function add_inequality_mark(size) {
    const grid = document.querySelector('.sudoku-grid');
    if (!grid) return;

    if (grid._inequality_mark_mode) return;
    grid._inequality_mark_mode = true;

    const container = grid.parentElement;
    container.style.position = 'relative';

    // 切换标记状态的辅助函数
    function toggleMark(mark) {
        const symbolDiv = mark.querySelector('div');
        if (symbolDiv.textContent === '>') {
            symbolDiv.textContent = '<';
        } else {
            mark.remove();
        }
    }

    grid.addEventListener('click', function handler(e) {
        const rect = grid.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const cell_width = grid.offsetWidth / size;
        const cell_height = grid.offsetHeight / size;

        const col = Math.floor(x / cell_width);
        const row = Math.floor(y / cell_height);

        const dist_to_v_line = Math.abs(x - (col + 1) * cell_width);
        const dist_to_h_line = Math.abs(y - (row + 1) * cell_height);

        const threshold = 12;

        let mark_x, mark_y, key, direction;
        if (dist_to_h_line < dist_to_v_line && dist_to_h_line < threshold && row < size - 1) {
            // 横向线（上下相邻），逻辑为 vertical
            mark_x = col * cell_width + cell_width / 2;
            mark_y = (row + 1) * cell_height;
            key = `h-${row + 1}-${col}`;
            direction = 'vertical';
        } else if (dist_to_v_line <= dist_to_h_line && dist_to_v_line < threshold && col < size - 1) {
            // 纵向线（左右相邻），逻辑为 horizontal
            mark_x = (col + 1) * cell_width;
            mark_y = row * cell_height + cell_height / 2;
            key = `v-${row}-${col + 1}`;
            direction = 'horizontal';
        } else {
            return;
        }

        const grid_offset_left = grid.offsetLeft;
        const grid_offset_top = grid.offsetTop;

        // 检查是否已存在标记
        const existingMark = container.querySelector(`.vx-mark[data-key="${key}"]`);
        if (existingMark) {
            toggleMark(existingMark);
            return;
        }

        // 创建新标记
        const mark = document.createElement('div');
        mark.className = 'vx-mark';
        mark.dataset.key = key;
        mark.style.position = 'absolute';
        mark.style.left = `${grid_offset_left + mark_x - 10}px`;
        mark.style.top = `${grid_offset_top + mark_y - 10}px`;
        mark.style.width = '20px';
        mark.style.height = '20px';
        mark.style.display = 'flex';
        mark.style.alignItems = 'center';
        mark.style.justifyContent = 'center';
        mark.style.fontSize = '24px';
        mark.style.color = '#333';
        mark.style.userSelect = 'none';
        mark.style.cursor = 'pointer';

        // 初始方向统一为 >
        const symbol = document.createElement('div');
        symbol.textContent = '>';
        if (direction === 'vertical') {
            symbol.style.transform = 'rotate(90deg)';
        }

        mark.appendChild(symbol);

        // 点击标记本身也触发切换
        mark.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleMark(this);
        });

        container.appendChild(mark);
    });
}

// 缓存每个格子的相关格（Peers）
let _peers_cache = null;
let _peers_cache_size = 0;
let _peers_cache_mode = '';

function get_peers(size, mode) {
    if (_peers_cache && _peers_cache_size === size && _peers_cache_mode === mode) {
        return _peers_cache;
    }

    const peers = Array.from({ length: size }, () => Array.from({ length: size }, () => []));
    const regions = get_all_regions(size, mode);

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const cell_peers = new Set();
            for (const region of regions) {
                // 检查当前格是否在该区域
                if (region.cells.some(([row, col]) => row === r && col === c)) {
                    for (const [row, col] of region.cells) {
                        if (row !== r || col !== c) {
                            // 将坐标编码为整数以存入 Set: r * size + c
                            cell_peers.add(row * size + col);
                        }
                    }
                }
            }
            // 解码回坐标数组
            peers[r][c] = Array.from(cell_peers).map(val => [Math.floor(val / size), val % size]);
        }
    }

    _peers_cache = peers;
    _peers_cache_size = size;
    _peers_cache_mode = mode;
    return peers;
}

// modules/inequality.js (update is_valid_inequality)
export function is_valid_inequality(board, size, row, col, num) {
    const mode = state.current_mode || 'inequality';
    
    // 1. 快速常规区域判断（使用预计算 Peers）
    const peers = get_peers(size, mode)[row][col];
    // 使用 for 循环比 for...of 稍快
    for (let i = 0; i < peers.length; i++) {
        const [r, c] = peers[i];
        if (board[r][c] === num) {
            return false;
        }
    }

    const constraintMap = getInequalityConstraintMap(size);
    const constraints = constraintMap.get(`${row},${col}`);
    if (!constraints) return true;

    for (const constraint of constraints) {
        const otherValue = board[constraint.otherRow]?.[constraint.otherCol];
        if (typeof otherValue !== 'number' || otherValue <= 0 || Array.isArray(otherValue)) continue;

        if (constraint.type === 'compare') {
            if (constraint.relation === '>' && !(num > otherValue)) return false;
            if (constraint.relation === '<' && !(num < otherValue)) return false;
        } else if (constraint.type === 'ratio') {
            if (!((num * constraint.right === otherValue * constraint.left) ||
                  (otherValue * constraint.right === num * constraint.left))) {
                return false;
            }
        }
    }

    return true;
}