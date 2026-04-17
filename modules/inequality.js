import { state, set_current_mode } from '../solver/state.js';
import { show_result, log_process, bold_border, create_base_grid, backup_original_board, restore_original_board, handle_key_navigation, create_base_cell, add_Extra_Button, clear_all_inputs, clear_marks, show_generating_timer, hide_generating_timer } from '../solver/core.js';
import { create_technique_panel } from '../solver/classic.js';
import { get_all_regions, solve, invalidate_regions_cache } from '../solver/solver_tool.js';
import { generate_solved_board_brute_force, generate_puzzle } from '../solver/generate.js';

const INEQUALITY_MARK_SELECTOR = '.vx-mark[data-key]';

function invalidate_inequality_constraints() {
    state._inequality_constraint_cache = null;
}

function ensure_inequality_marks() {
    if (!Array.isArray(state.inequality_marks)) {
        state.inequality_marks = [];
    }
    return state.inequality_marks;
}

function get_inequality_mark_key(row, col, type) {
    return type === 'v' ? `v-${row}-${col + 1}` : `h-${row + 1}-${col}`;
}

function parse_inequality_mark_key(key, size) {
    if (!key) return null;

    if (key.startsWith('v-')) {
        const parts = key.split('-');
        const row = Number(parts[1]);
        const col = Number(parts[2]) - 1;
        if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
        if (row < 0 || row >= size || col < 0 || col >= size - 1) return null;
        return { row, col, type: 'v' };
    }

    if (key.startsWith('h-')) {
        const parts = key.split('-');
        const row = Number(parts[1]) - 1;
        const col = Number(parts[2]);
        if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
        if (row < 0 || row >= size - 1 || col < 0 || col >= size) return null;
        return { row, col, type: 'h' };
    }

    return null;
}

function is_valid_inequality_mark_position(row, col, size, type) {
    if (type === 'v') {
        return row >= 0 && row < size && col >= 0 && col < size - 1;
    }
    return row >= 0 && row < size - 1 && col >= 0 && col < size;
}

function get_inequality_mark_signature(marks) {
    return marks
        .map(mark => `${mark.kind}:${mark.r}:${mark.c}:${mark.relation}`)
        .sort()
        .join('|');
}

function get_inequality_marks() {
    return ensure_inequality_marks();
}

function is_inequality_mark_exists_state(row, col, type) {
    const marks = ensure_inequality_marks();
    return marks.some(mark => mark.kind === type && mark.r === row && mark.c === col);
}

function add_inequality_mark_to_state(row, col, type, relation, size) {
    if (!is_valid_inequality_mark_position(row, col, size, type)) return false;
    if (relation !== '>' && relation !== '<') return false;
    if (is_inequality_mark_exists_state(row, col, type)) return false;

    ensure_inequality_marks().push({ kind: type, r: row, c: col, relation });
    invalidate_inequality_constraints();
    return true;
}

function remove_inequality_marks_from_state(keys = []) {
    if (!Array.isArray(state.inequality_marks) || keys.length === 0) return [];

    const key_set = new Set(keys.filter(Boolean));
    const removed = [];
    const next = [];

    for (const mark of state.inequality_marks) {
        const key = get_inequality_mark_key(mark.r, mark.c, mark.kind);
        if (key_set.has(key)) {
            removed.push(mark);
        } else {
            next.push(mark);
        }
    }

    state.inequality_marks = next;
    invalidate_inequality_constraints();
    return removed;
}

function restore_inequality_marks_to_state(marks = []) {
    if (!marks.length) return;

    const existing = ensure_inequality_marks();
    for (const mark of marks) {
        if (!existing.some(item => item.kind === mark.kind && item.r === mark.r && item.c === mark.c)) {
            existing.push(mark);
        }
    }
    invalidate_inequality_constraints();
}

function set_inequality_mark_relation(row, col, type, relation, size) {
    if (!is_valid_inequality_mark_position(row, col, size, type)) return false;
    if (relation !== '>' && relation !== '<') return false;

    const marks = ensure_inequality_marks();
    const existing = marks.find(mark => mark.kind === type && mark.r === row && mark.c === col);
    if (existing) {
        existing.relation = relation;
    } else {
        marks.push({ kind: type, r: row, c: col, relation });
    }

    invalidate_inequality_constraints();
    return true;
}

export function sync_inequality_marks_from_dom(size, container = document.querySelector('.sudoku-container')) {
    const marks = [];

    if (!container) {
        state.inequality_marks = marks;
        invalidate_inequality_constraints();
        return state.inequality_marks;
    }

    for (const mark_el of container.querySelectorAll(INEQUALITY_MARK_SELECTOR)) {
        const key = mark_el.dataset.key;
        const parsed = parse_inequality_mark_key(key, size);
        if (!parsed) continue;

        const relation = mark_el.querySelector('div')?.textContent?.trim();
        if (relation !== '>' && relation !== '<') continue;

        marks.push({ kind: parsed.type, r: parsed.row, c: parsed.col, relation });
    }

    state.inequality_marks = marks;
    invalidate_inequality_constraints();
    return state.inequality_marks;
}

function render_inequality_marks_from_state(size, container = document.querySelector('.sudoku-container')) {
    if (!container) return;

    Array.from(container.querySelectorAll('.vx-mark')).forEach(mark => mark.remove());

    const grid = container.querySelector('.sudoku-grid');
    if (!grid) return;

    const cell_width = grid.offsetWidth / size;
    const cell_height = grid.offsetHeight / size;
    const grid_offset_left = grid.offsetLeft;
    const grid_offset_top = grid.offsetTop;

    for (const mark_data of get_inequality_marks(size, container)) {
        const { kind, r, c, relation } = mark_data;
        let mark_x;
        let mark_y;
        let direction;

        if (kind === 'v') {
            mark_x = (c + 1) * cell_width;
            mark_y = r * cell_height + cell_height / 2;
            direction = 'horizontal';
        } else {
            mark_x = c * cell_width + cell_width / 2;
            mark_y = (r + 1) * cell_height;
            direction = 'vertical';
        }

        const key = get_inequality_mark_key(r, c, kind);
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

        const symbol_div = document.createElement('div');
        symbol_div.textContent = relation;
        if (direction === 'vertical') {
            symbol_div.style.transform = 'rotate(90deg)';
        }

        mark.appendChild(symbol_div);

        mark.addEventListener('click', function(e) {
            e.stopPropagation();
            const g = document.querySelector('.sudoku-grid');
            if (!g?._inequality_marking_active) return;
            if (relation === '>') {
                set_inequality_mark_relation(r, c, kind, '<', size);
            } else {
                remove_inequality_marks_from_state([key]);
            }
            render_inequality_marks_from_state(size, container);
        });

        container.appendChild(mark);
    }
}

export function get_inequality_constraint_map(size) {
    const marks = get_inequality_marks(size);
    const signature = get_inequality_mark_signature(marks);
    const cached = state._inequality_constraint_cache;

    if (cached && cached.size === size && cached.signature === signature) {
        return cached.map;
    }

    const map = new Map();
    const addConstraint = (row, col, constraint) => {
        const key = `${row},${col}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(constraint);
    };

    for (const mark of marks) {
        const a_row = mark.r;
        const a_col = mark.c;
        const b_row = mark.kind === 'v' ? mark.r : mark.r + 1;
        const b_col = mark.kind === 'v' ? mark.c + 1 : mark.c;
        const relation = mark.relation;

        addConstraint(a_row, a_col, { type: 'compare', otherRow: b_row, otherCol: b_col, relation });
        addConstraint(b_row, b_col, { type: 'compare', otherRow: a_row, otherCol: a_col, relation: relation === '>' ? '<' : '>' });
    }

    state._inequality_constraint_cache = { size, signature, map };
    return map;
}

export function apply_inequality_candidate_elimination(board, size, row, col, num, calc_score = true) {
    const eliminations = [];
    const constraint_map = get_inequality_constraint_map(size);
    const constraints = constraint_map.get(`${row},${col}`);

    if (!constraints) {
        return eliminations;
    }

    for (const constraint of constraints) {
        const other_row = constraint.otherRow;
        const other_col = constraint.otherCol;
        const other_cell = board[other_row]?.[other_col];

        if (!Array.isArray(other_cell) || constraint.type !== 'compare') {
            continue;
        }

        for (let k = other_cell.length - 1; k >= 0; k--) {
            const candidate = other_cell[k];
            const should_remove = constraint.relation === '>'
                ? candidate >= num
                : candidate <= num;

            if (!should_remove) {
                continue;
            }

            if (calc_score) {
                state.candidate_elimination_score[`${other_row},${other_col},${candidate}`] = 1;
            }

            eliminations.push({ row: other_row, col: other_col, val: candidate });
            other_cell.splice(k, 1);
        }
    }

    return eliminations;
}

export function apply_inequality_marks(board, size) {
    const marks = get_inequality_marks();

    for (const mark of marks) {
        let first_row;
        let first_col;
        let second_row;
        let second_col;

        if (mark.kind === 'v') {
            first_row = mark.r;
            first_col = mark.c;
            second_row = mark.r;
            second_col = mark.c + 1;
        } else if (mark.kind === 'h') {
            first_row = mark.r;
            first_col = mark.c;
            second_row = mark.r + 1;
            second_col = mark.c;
        } else {
            continue;
        }

        if (
            first_row < 0 || first_row >= size || first_col < 0 || first_col >= size ||
            second_row < 0 || second_row >= size || second_col < 0 || second_col >= size
        ) {
            continue;
        }

        const first_cell = board[first_row]?.[first_col];
        const second_cell = board[second_row]?.[second_col];

        if (mark.relation === '>') {
            if (Array.isArray(first_cell)) {
                board[first_row][first_col] = first_cell.filter(candidate => candidate !== 1);
            }
            if (Array.isArray(second_cell)) {
                board[second_row][second_col] = second_cell.filter(candidate => candidate !== size);
            }
        } else if (mark.relation === '<') {
            if (Array.isArray(first_cell)) {
                board[first_row][first_col] = first_cell.filter(candidate => candidate !== size);
            }
            if (Array.isArray(second_cell)) {
                board[second_row][second_col] = second_cell.filter(candidate => candidate !== 1);
            }
        }
    }
}

export function mark_all_inequality_marks(size, board = null) {
    const container = document.querySelector('.sudoku-container');
    const source_board = board || Array.from({ length: size }, (_, row) =>
        Array.from({ length: size }, (_, col) => {
            const input = container?.querySelector(`.sudoku-grid input[data-row="${row}"][data-col="${col}"]`);
            const value = parseInt(input?.value || '', 10);
            return Number.isFinite(value) ? value : 0;
        })
    );

    state.inequality_marks = [];
    invalidate_inequality_constraints();

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size - 1; col++) {
            const left = source_board[row]?.[col];
            const right = source_board[row]?.[col + 1];
            if (!Number.isFinite(left) || !Number.isFinite(right) || left <= 0 || right <= 0 || left === right) {
                continue;
            }
            add_inequality_mark_to_state(row, col, 'v', left < right ? '<' : '>', size);
        }
    }

    for (let row = 0; row < size - 1; row++) {
        for (let col = 0; col < size; col++) {
            const top = source_board[row]?.[col];
            const bottom = source_board[row + 1]?.[col];
            if (!Number.isFinite(top) || !Number.isFinite(bottom) || top <= 0 || bottom <= 0 || top === bottom) {
                continue;
            }
            add_inequality_mark_to_state(row, col, 'h', top < bottom ? '<' : '>', size);
        }
    }

    render_inequality_marks_from_state(size, container);
    return Array.isArray(state.inequality_marks) ? state.inequality_marks.length : 0;
}

// 新数独主入口
export function create_inequality_sudoku(size) {
    set_current_mode('inequality');
    state.inequality_marks = [];
    invalidate_inequality_constraints();
    show_result(`当前模式为不等号数独`);
    log_process('', true);
    log_process('规则：');
    log_process('标记：两侧格内数字大小关系');
    log_process('');
    log_process('技巧：');
    // log_process('"变型"：用到变型条件删数的技巧');
    log_process('"_n"后缀：区域内剩余空格数/区块用到的空格数');
    // log_process('"额外区域"：附加的不可重复区域');
    log_process('"特定组合"：受附加条件影响的区域');
    log_process('');
    log_process('出题：');
    log_process('10秒，超1分钟请重启页面或调整限制条件');
    log_process('若手动给的标记不合理可能会被代码忽视');
    log_process('');
    log_process('自动出题：');
    log_process('蓝色：自动添加标记出题');
    log_process('绿色：根据给定标记出题');
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
        Lookup_Table: true,
        Brute_Force: false,
        // Special_Combination_Region_Most_Not_Contain_1: true,
        // Special_Combination_Region_Most_Not_Contain_2: true,
        // Special_Combination_Region_Most_Not_Contain_3: true,
        // Multi_Special_Combination_Region_Most_Not_Contain_1: true,
        // Multi_Special_Combination_Region_Most_Not_Contain_2: true,
        // Multi_Special_Combination_Region_Most_Not_Contain_3: true,
        // Special_Combination_Region_Most_Contain_1: true,
        // Special_Combination_Region_Most_Contain_2: true,
        // Special_Combination_Region_Most_Contain_3: true,
        // Multi_Special_Combination_Region_Most_Contain_1: true,
        // Multi_Special_Combination_Region_Most_Contain_2: true,
        // Multi_Special_Combination_Region_Most_Contain_3: true,
        Special_Combination_Region_Cell_Elimination_1: true,
        Special_Combination_Region_Cell_Elimination_2: true,
        Special_Combination_Region_Cell_Elimination_3: true,
        // Multi_Special_Combination_Region_Cell_Elimination_1: true,
        // Multi_Special_Combination_Region_Cell_Elimination_2: true,
        // Multi_Special_Combination_Region_Cell_Elimination_3: true,
        // Special_Combination_Region_Elimination_1: true,
        // Special_Combination_Region_Elimination_2: true,
        Special_Combination_Region_Elimination_3: true,
        // Multi_Special_Combination_Region_Elimination_1: true,
        // Multi_Special_Combination_Region_Elimination_2: true,
        // Multi_Special_Combination_Region_Elimination_3: true,
        Special_Combination_Region_Block_1: true,
        // Special_Combination_Region_Block_2: true,
        // Special_Combination_Region_Block_3: true,
        // Multi_Special_Combination_Region_Block_1: true,
        // Multi_Special_Combination_Region_Block_2: true,
        // Multi_Special_Combination_Region_Block_3: true,
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
    add_Extra_Button('不等号', () => {create_inequality_sudoku(size)}, '#2196F3');

    // 添加标记 / 退出标记 切换按钮
    const toggle_mark_btn = add_Extra_Button('添加标记', () => {
        const g = document.querySelector('.sudoku-grid');
        if (!g) return;
        g._inequality_marking_active = !g._inequality_marking_active;
        toggle_mark_btn.textContent = g._inequality_marking_active ? '退出标记' : '添加标记';
    });

    add_Extra_Button('清除标记', clear_marks);
    add_Extra_Button('标记全部', () => {
        const count = mark_all_inequality_marks(size);
        show_result(`已添加 ${count} 个不等号标记`);
    }, '#4CAF50');
    add_Extra_Button('自动出题', state.create_mode_specific_generate_handler?.((score_lower_limit, holes_count) => generate_inequality_puzzle(size, score_lower_limit, holes_count)) || (() => generate_inequality_puzzle(size)), '#2196F3');
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
    state.inequality_marks = [];
    invalidate_inequality_constraints();
    render_inequality_marks_from_state(size, container);

    log_process('第一步：生成不等号数独终盘...');
    const solvedBoard = generate_solved_board_brute_force(size);
    if (!solvedBoard) {
        log_process('生成终盘失败！');
        return;
    }

    log_process('第二步：开始标记全部不等号标记...');
    const SYMMETRY_TYPES = [
        'central','central','central','central','central',
        'diagonal','diagonal',
        'anti-diagonal','anti-diagonal',
        'horizontal',
        'vertical'
    ];
    const symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];
    log_process(`使用对称类型: ${symmetry}`);

    let marks_added = 0;

    log_process(`正在生成题目，请稍候...`);
    // log_process('九宫：1分钟，超时请重启页面或调整限制条件');
    show_result(`正在生成题目，请稍候...`);
    show_generating_timer();
    
    setTimeout(() => {
        try {
            marks_added = mark_all_inequality_marks(size, solvedBoard);
            log_process(`已添加 ${marks_added} 个不等号标记`);

            backup_original_board();
            const result = solve(create_solver_board(size), size, is_valid_inequality, true);
            restore_original_board();

            if (result.solution_count === 1) {
                log_process(`✓ 全标记状态下达到唯一解`);
            } else if (result.solution_count === 0 || result.solution_count === -2) {
                log_process('✗ 全标记状态下无解，请检查终盘或约束逻辑');
            } else {
                log_process(`全标记状态下当前解数：${result.solution_count}`);
            }

            // 第二步：调用 generate_puzzle 函数出题
            log_process('第三步：调用标准出题流程生成题目...');
            const puzzle_result = generate_puzzle(size, score_lower_limit, holes_count, solvedBoard);
            
            if (!puzzle_result) {
                log_process('出题失败！');
                render_inequality_marks_from_state(size, container);
                return;
            }

            // 第三步：优化删除多余的不等号标记
            log_process('第四步：开始优化删除多余的不等号标记...');
            optimize_marks_state(size, symmetry);

            render_inequality_marks_from_state(size, container);

            generate_puzzle(size, score_lower_limit, holes_count, solvedBoard);
            const elapsed = ((performance.now() - start_time) / 1000).toFixed(3);
            show_result(`不等号数独出题完成（耗时${elapsed}秒）`);
        } finally {
            hide_generating_timer();
        }
    }, 0);

    // ==================== 内部函数定义 ====================
    
    function create_solver_board(size) {
        return Array.from({ length: size }, () =>
            Array.from({ length: size }, () => [...Array(size)].map((_, n) => n + 1))
        );
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

    function optimize_marks_state(size, symmetry) {
        log_process('开始最小化删除多余标记...');
        const groups = group_marks_by_symmetry_state(size, symmetry);
        let removed = 0;
        for (const group of groups) {
            const removed_marks = temporarily_remove_marks_state(group.keys);
            
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
                permanently_remove_marks_state(removed_marks);
                removed += removed_marks.length;
                log_process(`删除标记组 [${group.keys.join(', ')}]，仍保持唯一解`);
            } else {
                restore_marks_state(removed_marks);
                log_process(`标记组 [${group.keys.join(', ')}] 对唯一性有贡献，保留`);
            }
        }
        log_process(`标记优化完成，共删除 ${removed} 个多余标记`);
    }

    function group_marks_by_symmetry_state(size, symmetry) {
        const marks = get_inequality_marks(size).slice();
        const groups = [];
        const visited = new Set();

        for (const mark of marks) {
            const key = get_inequality_mark_key(mark.r, mark.c, mark.kind);
            if (visited.has(key)) continue;
            const base_row = mark.r;
            const base_col = mark.c;
            const base_type = mark.kind;
            const [sym_row, sym_col, sym_type] = get_symmetric(base_row, base_col, size, symmetry, base_type);
            if (!is_valid_inequality_mark_position(sym_row, sym_col, size, sym_type)) {
                groups.push({ keys: [key] });
                visited.add(key);
                continue;
            }
            const sym_key = get_inequality_mark_key(sym_row, sym_col, sym_type);
            if (sym_key && sym_key !== key && marks.some(m => get_inequality_mark_key(m.r, m.c, m.kind) === sym_key) && !visited.has(sym_key)) {
                groups.push({ keys: [key, sym_key] });
                visited.add(sym_key);
            } else {
                groups.push({ keys: [key] });
            }
            visited.add(key);
        }
        return groups;
    }

    function temporarily_remove_marks_state(keys = []) {
        return remove_inequality_marks_from_state(keys);
    }

    function restore_marks_state(removed_marks) {
        restore_inequality_marks_to_state(removed_marks);
    }

    function permanently_remove_marks_state(/* removed_marks */) {
        // 标记已在 temporarily_remove_marks_state 中从状态删除，无需额外处理
    }
}

function add_inequality_mark(size) {
    const grid = document.querySelector('.sudoku-grid');
    if (!grid) return;

    if (grid._inequality_mark_mode) return;
    grid._inequality_mark_mode = true;
    grid._inequality_marking_active = false;

    const container = grid.parentElement;
    container.style.position = 'relative';

    grid.addEventListener('click', function handler(e) {
        if (!grid._inequality_marking_active) return;
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

        let row_index;
        let col_index;
        let type;
        if (dist_to_h_line < dist_to_v_line && dist_to_h_line < threshold && row < size - 1) {
            row_index = row;
            col_index = col;
            type = 'h';
        } else if (dist_to_v_line <= dist_to_h_line && dist_to_v_line < threshold && col < size - 1) {
            row_index = row;
            col_index = col;
            type = 'v';
        } else {
            return;
        }

        const existing = get_inequality_marks(size, container).find(mark => mark.kind === type && mark.r === row_index && mark.c === col_index);
        if (!existing) {
            add_inequality_mark_to_state(row_index, col_index, type, '>', size);
        } else if (existing.relation === '>') {
            set_inequality_mark_relation(row_index, col_index, type, '<', size);
        } else {
            remove_inequality_marks_from_state([get_inequality_mark_key(row_index, col_index, type)]);
        }

        render_inequality_marks_from_state(size, container);
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

    const constraint_map = get_inequality_constraint_map(size);
    const constraints = constraint_map.get(`${row},${col}`);
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