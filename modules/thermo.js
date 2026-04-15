import { state, set_current_mode } from '../solver/state.js';
import { show_result, log_process, bold_border, create_base_grid, handle_key_navigation, create_base_cell, add_Extra_Button, clear_all_inputs, clear_marks, show_generating_timer, hide_generating_timer } from '../solver/core.js';
import { create_technique_panel } from '../solver/classic.js';
import { get_all_regions, solve, invalidate_regions_cache } from '../solver/solver_tool.js';
import { generate_solved_board_brute_force, generate_puzzle } from '../solver/generate.js';

function invalidate_thermo_constraints() {
    state._thermo_constraint_cache = null;
}

function ensure_thermo_marks() {
    if (!Array.isArray(state.thermo_marks)) {
        state.thermo_marks = [];
    }
    return state.thermo_marks;
}

function get_thermo_mark_key(row, col, type) {
    if (type === 'v') return `v-${row}-${col + 1}`;
    if (type === 'h') return `h-${row + 1}-${col}`;
    if (type === 'd') return `d-${row}-${col}`;
    if (type === 'a') return `a-${row}-${col}`;
    return '';
}

function is_valid_thermo_mark_position(row, col, size, type) {
    if (type === 'v') {
        return row >= 0 && row < size && col >= 0 && col < size - 1;
    }
    if (type === 'h') {
        return row >= 0 && row < size - 1 && col >= 0 && col < size;
    }
    if (type === 'd' || type === 'a') {
        return row >= 0 && row < size - 1 && col >= 0 && col < size - 1;
    }
    return false;
}

function get_thermo_mark_signature(marks) {
    return marks
        .map(mark => `${mark.kind}:${mark.r}:${mark.c}:${mark.relation}`)
        .sort()
        .join('|');
}

function get_thermo_marks() {
    return ensure_thermo_marks();
}

function is_thermo_mark_exists_state(row, col, type) {
    const marks = ensure_thermo_marks();
    return marks.some(mark => mark.kind === type && mark.r === row && mark.c === col);
}

function add_thermo_mark_to_state(row, col, type, relation, size) {
    if (!is_valid_thermo_mark_position(row, col, size, type)) return false;
    if (relation !== '>' && relation !== '<') return false;
    if (is_thermo_mark_exists_state(row, col, type)) return false;

    ensure_thermo_marks().push({ kind: type, r: row, c: col, relation });
    invalidate_thermo_constraints();
    return true;
}

function set_thermo_mark_relation(row, col, type, relation, size) {
    if (!is_valid_thermo_mark_position(row, col, size, type)) return false;
    if (relation !== '>' && relation !== '<') return false;

    const marks = ensure_thermo_marks();
    const existing = marks.find(mark => mark.kind === type && mark.r === row && mark.c === col);
    if (existing) {
        existing.relation = relation;
    } else {
        marks.push({ kind: type, r: row, c: col, relation });
    }

    invalidate_thermo_constraints();
    return true;
}

function render_thermo_marks_from_state(size, container = document.querySelector('.sudoku-container')) {
    if (!container) return;

    Array.from(container.querySelectorAll('.vx-mark')).forEach(mark => mark.remove());

    const grid = container.querySelector('.sudoku-grid');
    if (!grid) return;

    const marks = get_thermo_marks(size, container);
    if (!Array.isArray(marks) || marks.length === 0) return;

    const make_cell_key = (row, col) => `${row},${col}`;
    const adjacency = new Map();

    const ensure_node = (row, col) => {
        const key = make_cell_key(row, col);
        if (!adjacency.has(key)) {
            adjacency.set(key, { row, col, next: new Set(), prev: new Set() });
        }
        return adjacency.get(key);
    };

    for (const mark of marks) {
        const left_or_top = { row: mark.r, col: mark.c };
        let right_or_bottom;

        if (mark.kind === 'v') {
            right_or_bottom = { row: mark.r, col: mark.c + 1 };
        } else if (mark.kind === 'h') {
            right_or_bottom = { row: mark.r + 1, col: mark.c };
        } else if (mark.kind === 'd') {
            right_or_bottom = { row: mark.r + 1, col: mark.c + 1 };
        } else if (mark.kind === 'a') {
            const top_right = { row: mark.r, col: mark.c + 1 };
            const bottom_left = { row: mark.r + 1, col: mark.c };
            const from = mark.relation === '<' ? top_right : bottom_left;
            const to = mark.relation === '<' ? bottom_left : top_right;

            const from_node = ensure_node(from.row, from.col);
            const to_node = ensure_node(to.row, to.col);
            from_node.next.add(make_cell_key(to.row, to.col));
            to_node.prev.add(make_cell_key(from.row, from.col));
            continue;
        } else {
            continue;
        }

        const from = mark.relation === '<' ? left_or_top : right_or_bottom;
        const to = mark.relation === '<' ? right_or_bottom : left_or_top;

        const from_node = ensure_node(from.row, from.col);
        const to_node = ensure_node(to.row, to.col);
        from_node.next.add(make_cell_key(to.row, to.col));
        to_node.prev.add(make_cell_key(from.row, from.col));
    }

    const components = [];
    const visited = new Set();
    const nodes = Array.from(adjacency.values());

    for (const node of nodes) {
        const node_key = make_cell_key(node.row, node.col);
        if (visited.has(node_key)) continue;

        let start = node;
        let back_guard = 0;
        const back_seen = new Set([node_key]);

        while (start.prev.size === 1 && back_guard < size * size + 5) {
            back_guard++;
            const prev_key = Array.from(start.prev)[0];
            const prev_node = adjacency.get(prev_key);
            if (!prev_node) break;
            if (prev_node.next.size !== 1) break;
            if (back_seen.has(prev_key)) break;

            back_seen.add(prev_key);
            start = prev_node;
        }

        const path = [];
        let current = start;
        let guard = 0;

        while (current && guard < size * size + 5) {
            guard++;
            const current_key = make_cell_key(current.row, current.col);
            if (visited.has(current_key)) break;

            visited.add(current_key);
            path.push({ row: current.row, col: current.col });

            if (current.next.size !== 1) break;

            const next_key = Array.from(current.next)[0];
            const next = adjacency.get(next_key);
            if (!next) break;
            current = next;
        }

        if (path.length >= 2) {
            components.push(path);
        }
    }

    const cell_width = grid.offsetWidth / size;
    const cell_height = grid.offsetHeight / size;
    const grid_offset_left = grid.offsetLeft;
    const grid_offset_top = grid.offsetTop;
    const bulb_diameter = Math.max(12, Math.round(Math.min(cell_width, cell_height) * 0.62));
    const line_thickness = Math.max(6, Math.round(Math.min(cell_width, cell_height) * 0.22));

    const center_of = (cell) => ({
        x: grid_offset_left + (cell.col + 0.5) * cell_width,
        y: grid_offset_top + (cell.row + 0.5) * cell_height
    });

    const create_bulb_mark = (x, y, diameter) => {
        const bulb = document.createElement('div');
        bulb.className = 'vx-mark';
        bulb.style.position = 'absolute';
        bulb.style.left = `${x}px`;
        bulb.style.top = `${y}px`;
        bulb.style.width = `${diameter}px`;
        bulb.style.height = `${diameter}px`;
        bulb.style.borderRadius = '50%';
        bulb.style.background = '#bdbdbd';
        bulb.style.zIndex = '0';
        bulb.style.pointerEvents = 'none';
        return bulb;
    };

    const create_line_mark = (x, y, width, height, angle = 0) => {
        const line = document.createElement('div');
        line.className = 'vx-mark';
        line.style.position = 'absolute';
        line.style.left = `${x}px`;
        line.style.top = `${y}px`;
        line.style.width = `${width}px`;
        line.style.height = `${height}px`;
        line.style.transform = `rotate(${angle}deg)`;
        line.style.transformOrigin = 'center';
        line.style.background = 'transparent';
        line.style.borderRadius = '0';
        line.style.zIndex = '0';
        line.style.pointerEvents = 'none';

        const body_length = Math.max(0, width - height);
        if (body_length > 0) {
            const body = document.createElement('div');
            body.style.position = 'absolute';
            body.style.left = `${height / 2}px`;
            body.style.top = '0';
            body.style.width = `${body_length}px`;
            body.style.height = `${height}px`;
            body.style.background = '#bdbdbd';
            line.appendChild(body);
        }

        const cap_start = document.createElement('div');
        cap_start.style.position = 'absolute';
        cap_start.style.left = '0';
        cap_start.style.top = '0';
        cap_start.style.width = `${height}px`;
        cap_start.style.height = `${height}px`;
        cap_start.style.borderRadius = '50%';
        cap_start.style.background = '#bdbdbd';
        line.appendChild(cap_start);

        const cap_end = document.createElement('div');
        cap_end.style.position = 'absolute';
        cap_end.style.left = `${Math.max(0, width - height)}px`;
        cap_end.style.top = '0';
        cap_end.style.width = `${height}px`;
        cap_end.style.height = `${height}px`;
        cap_end.style.borderRadius = '50%';
        cap_end.style.background = '#bdbdbd';
        line.appendChild(cap_end);

        return line;
    };

    for (const path of components) {
        const start_center = center_of(path[0]);
        container.appendChild(
            create_bulb_mark(
                start_center.x - bulb_diameter / 2,
                start_center.y - bulb_diameter / 2,
                bulb_diameter
            )
        );

        for (let i = 1; i < path.length; i++) {
            const a = center_of(path[i - 1]);
            const b = center_of(path[i]);
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const center_distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            const draw_length = center_distance + line_thickness;

            container.appendChild(
                create_line_mark(
                    (a.x + b.x) / 2 - draw_length / 2,
                    (a.y + b.y) / 2 - line_thickness / 2,
                    draw_length,
                    line_thickness,
                    angle
                )
            );
        }
    }
}

export function get_thermo_constraint_map(size) {
    const marks = get_thermo_marks(size);
    const signature = get_thermo_mark_signature(marks);
    const cached = state._thermo_constraint_cache;

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
        let a_row;
        let a_col;
        let b_row;
        let b_col;

        if (mark.kind === 'v') {
            a_row = mark.r;
            a_col = mark.c;
            b_row = mark.r;
            b_col = mark.c + 1;
        } else if (mark.kind === 'h') {
            a_row = mark.r;
            a_col = mark.c;
            b_row = mark.r + 1;
            b_col = mark.c;
        } else if (mark.kind === 'd') {
            a_row = mark.r;
            a_col = mark.c;
            b_row = mark.r + 1;
            b_col = mark.c + 1;
        } else if (mark.kind === 'a') {
            a_row = mark.r;
            a_col = mark.c + 1;
            b_row = mark.r + 1;
            b_col = mark.c;
        } else {
            continue;
        }

        const relation = mark.relation;

        addConstraint(a_row, a_col, { type: 'compare', otherRow: b_row, otherCol: b_col, relation });
        addConstraint(b_row, b_col, { type: 'compare', otherRow: a_row, otherCol: a_col, relation: relation === '>' ? '<' : '>' });
    }

    state._thermo_constraint_cache = { size, signature, map };
    return map;
}

export function apply_thermo_candidate_elimination(board, size, row, col, num, calc_score = true) {
    const eliminations = [];
    const constraint_map = get_thermo_constraint_map(size);
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

export function apply_thermo_marks(board, size) {
    const marks = get_thermo_marks();

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
        } else if (mark.kind === 'd') {
            first_row = mark.r;
            first_col = mark.c;
            second_row = mark.r + 1;
            second_col = mark.c + 1;
        } else if (mark.kind === 'a') {
            first_row = mark.r;
            first_col = mark.c + 1;
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

// 新数独主入口
export function create_thermo_sudoku(size) {
    set_current_mode('thermo');
    state.thermo_marks = [];
    invalidate_thermo_constraints();
    show_result(`当前模式为温度计数独`);
    log_process('', true);
    log_process('规则：');
    log_process('温度计上的数字从圆泡处到尾部严格递增');
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
    add_thermo_mark(size);

    // 添加新数独专属按钮
    const extra_buttons = document.getElementById('extraButtons');
    extra_buttons.innerHTML = '';
    add_Extra_Button('温度计', () => {create_thermo_sudoku(size)}, '#2196F3');

    // 添加标记 / 退出标记 切换按钮
    const toggle_mark_btn = add_Extra_Button('添加标记', () => {
        const g = document.querySelector('.sudoku-grid');
        if (!g) return;
        g._thermo_marking_active = !g._thermo_marking_active;
        toggle_mark_btn.textContent = g._thermo_marking_active ? '退出标记' : '添加标记';
    });

    add_Extra_Button('清除标记', clear_marks);
    add_Extra_Button('自动出题', () => generate_thermo_puzzle(size), '#2196F3');
    // 可添加唯一性验证等按钮
}

// 自动生成温度计数独题目（生成圆圈并调用generate_puzzle）
export function generate_thermo_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    const start_time = performance.now();
    clear_all_inputs();
    log_process('', true);
    invalidate_regions_cache();

    state.thermo_marks = [];
    invalidate_thermo_constraints();
    // 保留开头清空旧温度计标记的可视化行为
    render_thermo_marks_from_state(size);

    log_process('第一步：生成温度计数独终盘...');
    const solvedBoard = generate_solved_board_brute_force(size);
    if (!solvedBoard) {
        log_process('生成终盘失败！');
        return;
    }

    log_process('第二步：根据终盘自动构建温度计标记...');
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
            marks_added = build_auto_marks_from_board(size, solvedBoard, symmetry);
            log_process(`已添加 ${marks_added} 个温度计标记`);

            const result = solve(create_solver_board(size), size, is_valid_thermo, true);

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
                render_thermo_marks_from_state(size);
                return;
            }

            // 仅在出题完成后一次性渲染温度计标记，避免生成过程依赖 DOM。
            render_thermo_marks_from_state(size);
            const elapsed = ((performance.now() - start_time) / 1000).toFixed(3);
            show_result(`温度计数独出题完成（耗时${elapsed}秒）`);
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

    function build_auto_marks_from_board(size, source_board, symmetry) {
        state.thermo_marks = [];
        invalidate_thermo_constraints();

        const min_thermo_length = Math.floor(size / 2); // 等价于长度 > size/2 - 1
        const max_thermo_count = Math.max(0, size - 1); // 条数 < size
        let thermo_count = 0;

        const half = size / 2;
        const used_cells = new Set();
        const processed_pairs = new Set();
        const candidate_seeds = [];

        const dirs = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        const is_inside = (row, col) => row >= 0 && row < size && col >= 0 && col < size;
        const cell_key = (row, col) => `${row},${col}`;
        const pair_key = (a, b) => {
            const ka = cell_key(a.row, a.col);
            const kb = cell_key(b.row, b.col);
            return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
        };
        const is_adjacent = (a, b) => {
            const dr = Math.abs(a.row - b.row);
            const dc = Math.abs(a.col - b.col);
            return dr <= 1 && dc <= 1 && (dr + dc) > 0;
        };
        const board_val = (cell) => source_board[cell.row]?.[cell.col];
        const direction_sign = (value) => {
            if (value < half) return 1;   // 头部，向外递增
            if (value > half) return -1;  // 尾部，向外递减
            return 0;                      // 位于中线值，跳过
        };

        const map_symmetric_cell = (cell) => {
            const row = cell.row;
            const col = cell.col;
            switch (symmetry) {
                case 'central':
                    return { row: size - 1 - row, col: size - 1 - col };
                case 'diagonal':
                    return { row: col, col: row };
                case 'anti-diagonal':
                    return { row: size - 1 - col, col: size - 1 - row };
                case 'horizontal':
                    return { row: size - 1 - row, col };
                case 'vertical':
                    return { row, col: size - 1 - col };
                default:
                    return { row, col };
            }
        };

        const add_path_marks = (path) => {
            for (let i = 1; i < path.length; i++) {
                const a = path[i - 1];
                const b = path[i];

                if (a.row === b.row) {
                    const row = a.row;
                    const col = Math.min(a.col, b.col);
                    const left = { row, col };
                    const right = { row, col: col + 1 };
                    const relation = board_val(left) < board_val(right) ? '<' : '>';
                    set_thermo_mark_relation(row, col, 'v', relation, size);
                } else if (a.col === b.col) {
                    const row = Math.min(a.row, b.row);
                    const col = a.col;
                    const top = { row, col };
                    const bottom = { row: row + 1, col };
                    const relation = board_val(top) < board_val(bottom) ? '<' : '>';
                    set_thermo_mark_relation(row, col, 'h', relation, size);
                } else {
                    const row = Math.min(a.row, b.row);
                    const col = Math.min(a.col, b.col);
                    const dr = b.row - a.row;
                    const dc = b.col - a.col;

                    if (dr === dc) {
                        const top_left = { row, col };
                        const bottom_right = { row: row + 1, col: col + 1 };
                        const relation = board_val(top_left) < board_val(bottom_right) ? '<' : '>';
                        set_thermo_mark_relation(row, col, 'd', relation, size);
                    } else {
                        const top_right = { row, col: col + 1 };
                        const bottom_left = { row: row + 1, col };
                        const relation = board_val(top_right) < board_val(bottom_left) ? '<' : '>';
                        set_thermo_mark_relation(row, col, 'a', relation, size);
                    }
                }
            }
        };

        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const a = { row, col };
                const b = map_symmetric_cell(a);
                if (!is_inside(b.row, b.col)) continue;
                if (a.row === b.row && a.col === b.col) continue;
                const key = pair_key(a, b);
                if (processed_pairs.has(key)) continue;
                processed_pairs.add(key);
                candidate_seeds.push([a, b]);
            }
        }

        // 随机化种子顺序，避免总是同一形状
        for (let i = candidate_seeds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidate_seeds[i], candidate_seeds[j]] = [candidate_seeds[j], candidate_seeds[i]];
        }

        for (const [seed_a, seed_b] of candidate_seeds) {
            if (thermo_count >= max_thermo_count) break;

            const seed_a_key = cell_key(seed_a.row, seed_a.col);
            const seed_b_key = cell_key(seed_b.row, seed_b.col);
            if (used_cells.has(seed_a_key) || used_cells.has(seed_b_key)) continue;

            const seed_val_a = board_val(seed_a);
            const seed_val_b = board_val(seed_b);
            if (!Number.isFinite(seed_val_a) || !Number.isFinite(seed_val_b)) continue;

            const dir_a = direction_sign(seed_val_a);
            const dir_b = direction_sign(seed_val_b);
            if (dir_a === 0 || dir_b === 0) continue;

            const path_a = [seed_a];
            const path_b = [seed_b];
            const local_used = new Set([seed_a_key, seed_b_key]);

            let extended = true;
            while (extended) {
                extended = false;

                const end_a = path_a[path_a.length - 1];
                const end_b = path_b[path_b.length - 1];
                const end_val_a = board_val(end_a);
                const end_val_b = board_val(end_b);

                const options = [];

                for (const [dr, dc] of dirs) {
                    const next_a = { row: end_a.row + dr, col: end_a.col + dc };
                    if (!is_inside(next_a.row, next_a.col)) continue;

                    const next_b = map_symmetric_cell(next_a);
                    if (!is_inside(next_b.row, next_b.col)) continue;
                    if (!is_adjacent(end_b, next_b)) continue;

                    const next_a_key = cell_key(next_a.row, next_a.col);
                    const next_b_key = cell_key(next_b.row, next_b.col);
                    if (next_a_key === next_b_key) continue;

                    if (local_used.has(next_a_key) || local_used.has(next_b_key)) continue;
                    if (used_cells.has(next_a_key) || used_cells.has(next_b_key)) continue;

                    const next_val_a = board_val(next_a);
                    const next_val_b = board_val(next_b);
                    if (!Number.isFinite(next_val_a) || !Number.isFinite(next_val_b)) continue;

                    const ok_a = dir_a > 0 ? (next_val_a > end_val_a) : (next_val_a < end_val_a);
                    const ok_b = dir_b > 0 ? (next_val_b > end_val_b) : (next_val_b < end_val_b);
                    if (!ok_a || !ok_b) continue;

                    // 优先值变化更温和的延长，避免一步冲到极值导致短链
                    const score = Math.abs(next_val_a - end_val_a) + Math.abs(next_val_b - end_val_b);
                    options.push({ next_a, next_b, next_a_key, next_b_key, score });
                }

                if (options.length > 0) {
                    options.sort((x, y) => x.score - y.score || Math.random() - 0.5);
                    const chosen = options[0];
                    path_a.push(chosen.next_a);
                    path_b.push(chosen.next_b);
                    local_used.add(chosen.next_a_key);
                    local_used.add(chosen.next_b_key);
                    extended = true;
                }
            }

            const can_add_pair =
                path_a.length >= min_thermo_length &&
                path_b.length >= min_thermo_length &&
                thermo_count + 2 <= max_thermo_count;

            if (can_add_pair) {
                add_path_marks(path_a);
                for (const cell of path_a) {
                    used_cells.add(cell_key(cell.row, cell.col));
                }

                add_path_marks(path_b);
                for (const cell of path_b) {
                    used_cells.add(cell_key(cell.row, cell.col));
                }

                thermo_count += 2;
            }
        }

        return Array.isArray(state.thermo_marks) ? state.thermo_marks.length : 0;
    }

}

function add_thermo_mark(size) {
    const grid = document.querySelector('.sudoku-grid');
    if (!grid) return;

    if (grid._thermo_mark_mode) return;
    grid._thermo_mark_mode = true;
    grid._thermo_marking_active = false;

    const container = grid.parentElement;
    container.style.position = 'relative';

    let is_dragging = false;
    let drag_path_cells = [];

    const get_grid_metrics = () => {
        const grid_rect = grid.getBoundingClientRect();
        const container_rect = container.getBoundingClientRect();
        const cell_width = grid_rect.width / size;
        const cell_height = grid_rect.height / size;
        return {
            grid_rect,
            cell_width,
            cell_height,
            offset_left: grid_rect.left - container_rect.left,
            offset_top: grid_rect.top - container_rect.top
        };
    };

    const clear_preview_marks = () => {
        container.querySelectorAll('.thermo-preview-mark').forEach(el => el.remove());
    };

    const remove_rendered_thermo_marks = () => {
        container.querySelectorAll('.vx-mark').forEach(el => el.remove());
    };

    const make_cell_key = (row, col) => `${row},${col}`;

    const get_cell_from_pointer = (client_x, client_y) => {
        const el = document.elementFromPoint(client_x, client_y);
        const cell = el?.closest?.('.sudoku-cell');
        if (!cell || !grid.contains(cell)) return null;

        const row = Number(cell.dataset.row);
        const col = Number(cell.dataset.col);
        if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
        if (row < 0 || row >= size || col < 0 || col >= size) return null;

        return { row, col };
    };

    const is_adjacent = (a, b) => {
        const dr = Math.abs(a.row - b.row);
        const dc = Math.abs(a.col - b.col);
        return dr <= 1 && dc <= 1 && (dr + dc) > 0;
    };

    const is_in_orthogonal_hit_zone = (from_cell, to_cell, client_x, client_y) => {
        // 仅缩小上下左右判定区域：
        // 左右移动时，要求鼠标更接近目标格的水平中线；
        // 上下移动时，要求鼠标更接近目标格的垂直中线。
        const is_horizontal = from_cell.row === to_cell.row && from_cell.col !== to_cell.col;
        const is_vertical = from_cell.col === to_cell.col && from_cell.row !== to_cell.row;
        if (!is_horizontal && !is_vertical) {
            return true;
        }

        const { grid_rect, cell_width, cell_height } = get_grid_metrics();
        const pointer_x = client_x - grid_rect.left;
        const pointer_y = client_y - grid_rect.top;
        const target_center_x = (to_cell.col + 0.5) * cell_width;
        const target_center_y = (to_cell.row + 0.5) * cell_height;

        const lane_ratio = 0.24;
        const half_lane_w = cell_width * lane_ratio;
        const half_lane_h = cell_height * lane_ratio;

        if (is_horizontal) {
            return Math.abs(pointer_y - target_center_y) <= half_lane_h;
        }

        return Math.abs(pointer_x - target_center_x) <= half_lane_w;
    };

    const create_line_mark = (x, y, width, height, angle = 0, is_preview = false) => {
        const line = document.createElement('div');
        line.className = is_preview ? 'thermo-preview-mark' : 'vx-mark';
        line.style.position = 'absolute';
        line.style.left = `${x}px`;
        line.style.top = `${y}px`;
        line.style.width = `${width}px`;
        line.style.height = `${height}px`;
        line.style.transform = `rotate(${angle}deg)`;
        line.style.transformOrigin = 'center';
        line.style.background = 'transparent';
        line.style.borderRadius = '0';
        line.style.pointerEvents = 'none';
        line.style.opacity = is_preview ? '0.8' : '1';
        line.style.zIndex = is_preview ? '6' : '0';

        const body_length = Math.max(0, width - height);
        if (body_length > 0) {
            const body = document.createElement('div');
            body.style.position = 'absolute';
            body.style.left = `${height / 2}px`;
            body.style.top = '0';
            body.style.width = `${body_length}px`;
            body.style.height = `${height}px`;
            body.style.background = '#bdbdbd';
            line.appendChild(body);
        }

        const cap_start = document.createElement('div');
        cap_start.style.position = 'absolute';
        cap_start.style.left = '0';
        cap_start.style.top = '0';
        cap_start.style.width = `${height}px`;
        cap_start.style.height = `${height}px`;
        cap_start.style.borderRadius = '50%';
        cap_start.style.background = '#bdbdbd';
        line.appendChild(cap_start);

        const cap_end = document.createElement('div');
        cap_end.style.position = 'absolute';
        cap_end.style.left = `${Math.max(0, width - height)}px`;
        cap_end.style.top = '0';
        cap_end.style.width = `${height}px`;
        cap_end.style.height = `${height}px`;
        cap_end.style.borderRadius = '50%';
        cap_end.style.background = '#bdbdbd';
        line.appendChild(cap_end);

        return line;
    };

    const create_bulb_mark = (x, y, diameter, is_preview = false) => {
        const bulb = document.createElement('div');
        bulb.className = is_preview ? 'thermo-preview-mark' : 'vx-mark';
        bulb.style.position = 'absolute';
        bulb.style.left = `${x}px`;
        bulb.style.top = `${y}px`;
        bulb.style.width = `${diameter}px`;
        bulb.style.height = `${diameter}px`;
        bulb.style.borderRadius = '50%';
        bulb.style.background = '#bdbdbd';
        bulb.style.pointerEvents = 'none';
        bulb.style.opacity = is_preview ? '0.88' : '1';
        bulb.style.zIndex = is_preview ? '6' : '0';
        return bulb;
    };

    const draw_thermo_visual = (path_cells, is_preview = false) => {
        if (!Array.isArray(path_cells) || path_cells.length === 0) return;

        const {
            cell_width,
            cell_height,
            offset_left,
            offset_top
        } = get_grid_metrics();

        const center_of = (cell) => ({
            x: offset_left + (cell.col + 0.5) * cell_width,
            y: offset_top + (cell.row + 0.5) * cell_height
        });

        const bulb_diameter = Math.max(12, Math.round(Math.min(cell_width, cell_height) * 0.62));
        const start_center = center_of(path_cells[0]);

        const bulb = create_bulb_mark(
            start_center.x - bulb_diameter / 2,
            start_center.y - bulb_diameter / 2,
            bulb_diameter,
            is_preview
        );
        container.appendChild(bulb);

        const line_thickness = Math.max(6, Math.round(Math.min(cell_width, cell_height) * 0.22));

        for (let i = 1; i < path_cells.length; i++) {
            const a = center_of(path_cells[i - 1]);
            const b = center_of(path_cells[i]);
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const center_distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            // 线段绘制长度额外加上线宽，使两端圆头圆心正好落在格子中心。
            const draw_length = center_distance + line_thickness;

            const line = create_line_mark(
                (a.x + b.x) / 2 - draw_length / 2,
                (a.y + b.y) / 2 - line_thickness / 2,
                draw_length,
                line_thickness,
                angle,
                is_preview
            );
            container.appendChild(line);
        }
    };

    const build_components_from_state = () => {
        const marks = ensure_thermo_marks();
        const adjacency = new Map();

        const ensure_node = (row, col) => {
            const key = make_cell_key(row, col);
            if (!adjacency.has(key)) {
                adjacency.set(key, { row, col, next: new Set(), prev: new Set() });
            }
            return adjacency.get(key);
        };

        for (const mark of marks) {
            const left_or_top = { row: mark.r, col: mark.c };
            let right_or_bottom;

            if (mark.kind === 'v') {
                right_or_bottom = { row: mark.r, col: mark.c + 1 };
            } else if (mark.kind === 'h') {
                right_or_bottom = { row: mark.r + 1, col: mark.c };
            } else if (mark.kind === 'd') {
                right_or_bottom = { row: mark.r + 1, col: mark.c + 1 };
            } else if (mark.kind === 'a') {
                // a: top-right 与 bottom-left
                const top_right = { row: mark.r, col: mark.c + 1 };
                const bottom_left = { row: mark.r + 1, col: mark.c };
                const from = mark.relation === '<' ? top_right : bottom_left;
                const to = mark.relation === '<' ? bottom_left : top_right;

                const from_node = ensure_node(from.row, from.col);
                const to_node = ensure_node(to.row, to.col);
                from_node.next.add(make_cell_key(to.row, to.col));
                to_node.prev.add(make_cell_key(from.row, from.col));
                continue;
            } else {
                continue;
            }

            const from = mark.relation === '<' ? left_or_top : right_or_bottom;
            const to = mark.relation === '<' ? right_or_bottom : left_or_top;

            const from_node = ensure_node(from.row, from.col);
            const to_node = ensure_node(to.row, to.col);
            from_node.next.add(make_cell_key(to.row, to.col));
            to_node.prev.add(make_cell_key(from.row, from.col));
        }

        const visited = new Set();
        const components = [];
        const nodes = Array.from(adjacency.values());

        for (const node of nodes) {
            const start_key = make_cell_key(node.row, node.col);
            if (visited.has(start_key)) continue;

            let start = node;
            if (node.prev.size > 0) {
                for (const candidate of nodes) {
                    if (candidate.prev.size === 0 && !visited.has(make_cell_key(candidate.row, candidate.col))) {
                        start = candidate;
                        break;
                    }
                }
            }

            const path = [];
            let current = start;
            let guard = 0;

            while (current && guard < size * size + 5) {
                guard++;
                const current_key = make_cell_key(current.row, current.col);
                if (visited.has(current_key)) break;
                visited.add(current_key);
                path.push({ row: current.row, col: current.col });

                const next_keys = Array.from(current.next);
                if (next_keys.length !== 1) break;

                const next_key = next_keys[0];
                const next = adjacency.get(next_key);
                if (!next) break;
                current = next;
            }

            if (path.length >= 2) {
                components.push(path);
            }
        }

        return components;
    };

    const render_saved_thermo_marks = () => {
        remove_rendered_thermo_marks();
        const components = build_components_from_state();
        for (const path of components) {
            draw_thermo_visual(path, false);
        }
    };

    const commit_drag_path_to_state = (path_cells) => {
        if (!Array.isArray(path_cells) || path_cells.length < 2) return;

        for (let i = 1; i < path_cells.length; i++) {
            const a = path_cells[i - 1];
            const b = path_cells[i];

            if (a.row === b.row) {
                const row = a.row;
                const col = Math.min(a.col, b.col);
                const relation = a.col < b.col ? '<' : '>';
                set_thermo_mark_relation(row, col, 'v', relation, size);
            } else if (a.col === b.col) {
                const row = Math.min(a.row, b.row);
                const col = a.col;
                const relation = a.row < b.row ? '<' : '>';
                set_thermo_mark_relation(row, col, 'h', relation, size);
            } else {
                const row = Math.min(a.row, b.row);
                const col = Math.min(a.col, b.col);
                const dr = b.row - a.row;
                const dc = b.col - a.col;

                if (dr === dc) {
                    // \ 对角线：top-left 与 bottom-right
                    const a_is_top_left = a.row === row && a.col === col;
                    const relation = a_is_top_left ? '<' : '>';
                    set_thermo_mark_relation(row, col, 'd', relation, size);
                } else {
                    // / 对角线：top-right 与 bottom-left
                    const top_right = { row, col: col + 1 };
                    const a_is_top_right = a.row === top_right.row && a.col === top_right.col;
                    const relation = a_is_top_right ? '<' : '>';
                    set_thermo_mark_relation(row, col, 'a', relation, size);
                }
            }
        }
    };

    const collect_occupied_cells_from_state = () => {
        const occupied = new Set();
        const marks = ensure_thermo_marks();

        for (const mark of marks) {
            if (mark.kind === 'v') {
                occupied.add(make_cell_key(mark.r, mark.c));
                occupied.add(make_cell_key(mark.r, mark.c + 1));
            } else if (mark.kind === 'h') {
                occupied.add(make_cell_key(mark.r, mark.c));
                occupied.add(make_cell_key(mark.r + 1, mark.c));
            } else if (mark.kind === 'd') {
                occupied.add(make_cell_key(mark.r, mark.c));
                occupied.add(make_cell_key(mark.r + 1, mark.c + 1));
            } else if (mark.kind === 'a') {
                occupied.add(make_cell_key(mark.r, mark.c + 1));
                occupied.add(make_cell_key(mark.r + 1, mark.c));
            }
        }

        return occupied;
    };

    const path_overlaps_existing_thermo = (path_cells) => {
        if (!Array.isArray(path_cells) || path_cells.length === 0) return false;
        const occupied_cells = collect_occupied_cells_from_state();
        return path_cells.some(cell => occupied_cells.has(make_cell_key(cell.row, cell.col)));
    };

    const finish_drag = () => {
        if (!is_dragging) return;
        is_dragging = false;

        clear_preview_marks();
        if (!path_overlaps_existing_thermo(drag_path_cells)) {
            commit_drag_path_to_state(drag_path_cells);
        }
        drag_path_cells = [];
        render_saved_thermo_marks();
    };

    const start_drag = (start_cell) => {
        // 若用户使用了全局“清除标记”，thermo 状态可能未清空，这里做一次自愈。
        if (container.querySelectorAll('.vx-mark').length === 0 && Array.isArray(state.thermo_marks) && state.thermo_marks.length > 0) {
            state.thermo_marks = [];
            invalidate_thermo_constraints();
        }

        is_dragging = true;
        drag_path_cells = [start_cell];
        clear_preview_marks();
        draw_thermo_visual(drag_path_cells, true);
    };

    const update_drag = (cell, client_x, client_y) => {
        if (!is_dragging || !cell) return;

        const last = drag_path_cells[drag_path_cells.length - 1];
        if (cell.row === last.row && cell.col === last.col) {
            return;
        }

        if (!is_adjacent(last, cell)) {
            return;
        }

        if (!is_in_orthogonal_hit_zone(last, cell, client_x, client_y)) {
            return;
        }

        const prev = drag_path_cells.length > 1 ? drag_path_cells[drag_path_cells.length - 2] : null;
        if (prev && prev.row === cell.row && prev.col === cell.col) {
            drag_path_cells.pop();
        } else {
            const existed = drag_path_cells.some(p => p.row === cell.row && p.col === cell.col);
            if (existed) {
                // 命中旧格：忽略，不做任何处理。
                return;
            }
            drag_path_cells.push(cell);
        }

        clear_preview_marks();
        draw_thermo_visual(drag_path_cells, true);
    };

    grid.addEventListener('pointerdown', (e) => {
        if (!grid._thermo_marking_active) return;
        if (e.button !== 0) return;

        const start_cell = get_cell_from_pointer(e.clientX, e.clientY);
        if (!start_cell) return;

        start_drag(start_cell);
        grid.setPointerCapture?.(e.pointerId);
        e.preventDefault();
    });

    grid.addEventListener('pointermove', (e) => {
        if (!is_dragging || !grid._thermo_marking_active) return;
        const cell = get_cell_from_pointer(e.clientX, e.clientY);
        update_drag(cell, e.clientX, e.clientY);
    });

    grid.addEventListener('pointerup', (e) => {
        if (!grid._thermo_marking_active) return;
        finish_drag();
        grid.releasePointerCapture?.(e.pointerId);
    });

    grid.addEventListener('pointercancel', () => {
        finish_drag();
    });

    // 进入模式后先按当前状态渲染一次，保证样式统一为“灰圆+灰线”。
    render_saved_thermo_marks();
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

// modules/thermo.js (update is_valid_thermo)
export function is_valid_thermo(board, size, row, col, num) {
    const mode = state.current_mode || 'thermo';
    
    // 1. 快速常规区域判断（使用预计算 Peers）
    const peers = get_peers(size, mode)[row][col];
    // 使用 for 循环比 for...of 稍快
    for (let i = 0; i < peers.length; i++) {
        const [r, c] = peers[i];
        if (board[r][c] === num) {
            return false;
        }
    }

    const constraint_map = get_thermo_constraint_map(size);
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