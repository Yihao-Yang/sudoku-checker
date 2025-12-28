import { state, set_current_mode } from '../solver/state.js';
import { show_result, log_process, bold_border, create_base_grid, backup_original_board, restore_original_board, handle_key_navigation, create_base_cell, add_Extra_Button, clear_all_inputs, clear_marks } from '../solver/core.js';
import { create_technique_panel } from '../solver/classic.js';
import { get_all_regions, solve, invalidate_regions_cache } from '../solver/solver_tool.js';
import { generate_solved_board_brute_force } from '../solver/generate.js';

// 新数独主入口
export function create_ratio_sudoku(size) {
    set_current_mode('ratio');
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
        Special_Combination_Region_Most_Not_Contain_1: true,
        Special_Combination_Region_Most_Not_Contain_2: true,
        Special_Combination_Region_Most_Not_Contain_3: true,
        Multi_Special_Combination_Region_Most_Not_Contain_1: true,
        Multi_Special_Combination_Region_Most_Not_Contain_2: true,
        Multi_Special_Combination_Region_Most_Not_Contain_3: true,
        Special_Combination_Region_Most_Contain_1: true,
        Special_Combination_Region_Most_Contain_2: true,
        Special_Combination_Region_Most_Contain_3: true,
        Multi_Special_Combination_Region_Most_Contain_1: true,
        Multi_Special_Combination_Region_Most_Contain_2: true,
        Multi_Special_Combination_Region_Most_Contain_3: true,
        Special_Combination_Region_Cell_Elimination_1: true,
        Special_Combination_Region_Cell_Elimination_2: true,
        Special_Combination_Region_Cell_Elimination_3: true,
        Multi_Special_Combination_Region_Cell_Elimination_1: true,
        Multi_Special_Combination_Region_Cell_Elimination_2: true,
        Multi_Special_Combination_Region_Cell_Elimination_3: true,
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
    add_ratio_mark(size);

    // 添加新数独专属按钮
    const extra_buttons = document.getElementById('extraButtons');
    extra_buttons.innerHTML = '';
    add_Extra_Button('清除标记', clear_marks);
    add_Extra_Button('自动出题', () => generate_ratio_puzzle(size), '#2196F3');
    // 可添加唯一性验证等按钮
}

// 自动生成比例数独题目（生成圆圈并调用generate_puzzle）
export function generate_ratio_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    const start_time = performance.now();
    clear_all_inputs();
    log_process('', true);
    invalidate_regions_cache();

    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    Array.from(container.querySelectorAll('.vx-mark')).forEach(mark => mark.remove());

    log_process('第一步：生成比例数独终盘...');
    const solvedBoard = generate_solved_board_brute_force(size);
    if (!solvedBoard) {
        log_process('生成终盘失败！');
        return;
    }

    log_process('第二步：开始添加对称提示标记...');
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
    let unique_found = false;

    while (try_count < MAX_TRY && marks_added < MAX_MARKS && !unique_found) {
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
        const mainRatio = calculate_ratio_from_solved(row, col, type, solvedBoard);
        if (!mainRatio) continue;

        const mainMark = add_ratio_mark_with_value(row, col, size, container, type, mainRatio);
        if (!mainMark) continue;
        addedMarks.push(mainMark);

        const symmetric_is_same = row === sym_row && col === sym_col && type === sym_type;
        if (!symmetric_is_same) {
            const symRatio = calculate_ratio_from_solved(sym_row, sym_col, sym_type, solvedBoard);
            if (!symRatio) {
                remove_marks(addedMarks);
                continue;
            }
            const symMark = add_ratio_mark_with_value(sym_row, sym_col, size, container, sym_type, symRatio);
            if (!symMark) {
                remove_marks(addedMarks);
                continue;
            }
            addedMarks.push(symMark);
        }

        marks_added += addedMarks.length;

        backup_original_board();
        const result = solve(create_solver_board(size), size, is_valid_ratio, true);
        restore_original_board();

        if (result.solution_count === 1) {
            unique_found = true;
            log_process(`✓ 找到唯一解！共添加 ${marks_added} 个标记`);
            optimize_marks(container, size, symmetry);
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

    const elapsed = ((performance.now() - start_time) / 1000).toFixed(3);
    show_result(`比例数独提示生成完成（${unique_found ? '唯一解' : '未验证唯一'}，耗时${elapsed}秒）`);

    if (!unique_found) {
        if (try_count >= MAX_TRY) {
            log_process('自动出题失败：达到最大尝试次数');
        } else {
            log_process('自动出题完成（可能非唯一解）');
        }
    }

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

    function calculate_ratio_from_solved(row, col, type, solvedBoard) {
        let a, b;
        if (type === 'v') {
            a = solvedBoard[row]?.[col];
            b = solvedBoard[row]?.[col + 1];
        } else {
            a = solvedBoard[row]?.[col];
            b = solvedBoard[row + 1]?.[col];
        }
        if (!a || !b) return null;

        const small = Math.min(a, b);
        const big = Math.max(a, b);
        if (small === big) return null;

        const divisor = gcd(small, big);
        const numerator = small / divisor;
        const denominator = big / divisor;
        if (numerator >= denominator) return null;

        return `${numerator}/${denominator}`;
    }

    function gcd(a, b) {
        while (b !== 0) {
            [a, b] = [b, a % b];
        }
        return a;
    }

    function add_ratio_mark_with_value(row, col, size, container, type, ratio) {
        const grid = container.querySelector('.sudoku-grid');
        if (!grid) return null;

        const cell_width = grid.offsetWidth / size;
        const cell_height = grid.offsetHeight / size;

        let mark_x, mark_y, key;
        if (type === 'v') {
            mark_x = (col + 1) * cell_width;
            mark_y = row * cell_height + cell_height / 2;
            key = get_mark_key(row, col, type);
        } else {
            mark_x = col * cell_width + cell_width / 2;
            mark_y = (row + 1) * cell_height;
            key = get_mark_key(row, col, type);
        }

        const grid_offset_left = grid.offsetLeft;
        const grid_offset_top = grid.offsetTop;

        const mark = document.createElement('div');
        mark.className = 'vx-mark';
        mark.dataset.key = key;
        mark.style.position = 'absolute';
        mark.style.left = `${grid_offset_left + mark_x - 18}px`;
        mark.style.top = `${grid_offset_top + mark_y - 10}px`;
        mark.style.width = '36px';
        mark.style.height = '20px';

        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 5;
        input.value = ratio;
        input.style.width = '38px';
        input.style.height = '28px';
        input.style.fontSize = '22px';
        input.style.textAlign = 'center';
        input.style.border = 'none';
        input.style.background = 'transparent';
        input.style.outline = 'none';
        input.style.position = 'absolute';
        input.style.left = '50%';
        input.style.top = '50%';
        input.style.transform = 'translate(-50%, -50%)';
        input.style.color = '#333';

        mark.appendChild(input);
        mark.ondblclick = function(e) {
            e.stopPropagation();
            mark.remove();
        };
        input.ondblclick = function(e) {
            e.stopPropagation();
            mark.remove();
        };
        container.appendChild(mark);
        return mark;
    }

    function optimize_marks(container, size, symmetry) {
        log_process('开始优化标记，删除无用条件...');
        const groups = group_marks_by_symmetry(container, size, symmetry);
        let removed = 0;
        for (const group of groups) {
            const removedMarks = temporarily_remove_marks(container, group.keys);
            backup_original_board();
            const result = solve(create_solver_board(size), size, is_valid_ratio, true);
            restore_original_board();
            if (result.solution_count === 1) {
                permanently_remove_marks(removedMarks);
                removed += removedMarks.length;
            } else {
                restore_marks(container, removedMarks);
            }
        }
        log_process(`优化完成，共删除 ${removed} 个标记`);
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

function add_ratio_mark(size) {
    const grid = document.querySelector('.sudoku-grid');
    if (!grid) return;

    if (grid._ratio_mark_mode) return;
    grid._ratio_mark_mode = true;

    const container = grid.parentElement;
    container.style.position = 'relative';

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

        let mark_x, mark_y, key;
        if (dist_to_v_line < dist_to_h_line && dist_to_v_line < threshold && col < size - 1) {
            mark_x = (col + 1) * cell_width;
            mark_y = row * cell_height + cell_height / 2;
            key = `v-${row}-${col + 1}`;
        } else if (dist_to_h_line <= dist_to_v_line && dist_to_h_line < threshold && row < size - 1) {
            mark_x = col * cell_width + cell_width / 2;
            mark_y = (row + 1) * cell_height;
            key = `h-${row + 1}-${col}`;
        } else {
            return;
        }

        const grid_offset_left = grid.offsetLeft;
        const grid_offset_top = grid.offsetTop;

        const marks = Array.from(container.querySelectorAll('.vx-mark'));
        if (marks.some(m => m.dataset.key === key)) {
            return;
        }

        const mark = document.createElement('div');
        mark.className = 'vx-mark';
        mark.dataset.key = key;
        mark.style.position = 'absolute';
        mark.style.left = `${grid_offset_left + mark_x - 18}px`;
        mark.style.top = `${grid_offset_top + mark_y - 10}px`;
        mark.style.width = '36px';
        mark.style.height = '20px';

        // 创建只显示斜杠的输入框
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 3;
        input.style.width = '38px';
        input.style.height = '28px';
        input.style.fontSize = '22px';
        input.style.textAlign = 'center';
        input.style.border = 'none';
        input.style.background = 'transparent';
        input.style.outline = 'none';
        input.style.position = 'absolute';
        input.style.left = '50%';
        input.style.top = '50%';
        input.style.transform = 'translate(-50%, -50%)';
        input.style.color = '#333';

        // 初始内容为'/'
        input.value = '/';

        // 输入时自动格式化为 左/右
        input.addEventListener('input', function() {
            const max_value = size;
            const regex = new RegExp(`[^1-${max_value}]`, 'g');
            const digits = this.value.replace(regex, '');

            let left = '';
            let right = '';

            if (digits.length === 1) {
                right = digits[0];
            } else if (digits.length >= 2) {
                const first = parseInt(digits[0], 10);
                const second = parseInt(digits[1], 10);
                if (first !== second) {
                    const [minVal, maxVal] = first < second ? [first, second] : [second, first];
                    left = String(minVal);
                    right = String(maxVal);
                }
            }

            if (left && right) {
                this.value = `${left}/${right}`;
            } else if (left) {
                this.value = `${left}/`;
            } else if (right) {
                this.value = `/${right}`;
            } else {
                this.value = '/';
            }
        });

        // 保证光标不能移到/前面
        input.addEventListener('keydown', function(e) {
            // 禁止删除斜杠
            if ((e.key === 'Backspace' && this.selectionStart === 1) ||
                (e.key === 'Delete' && this.selectionStart === 0)) {
                e.preventDefault();
            }
            // 输入时自动跳过斜杠
            if (e.key.length === 1 && /[0-9]/.test(e.key)) {
                if (this.selectionStart === 1) {
                    this.setSelectionRange(2, 2);
                }
            }
        });

        // 点击时自动跳到斜杠后
        input.addEventListener('focus', function() {
            // 如果左侧有数字，光标放在右侧，否则放在右侧
            if (this.value.length <= 1) {
                this.setSelectionRange(2, 2);
            } else {
                this.setSelectionRange(this.value.length, this.value.length);
            }
        });

        mark.ondblclick = function(e) {
            e.stopPropagation();
            mark.remove();
        };
        input.ondblclick = function(e) {
            e.stopPropagation();
            mark.remove();
        };

        mark.appendChild(input);
        container.appendChild(mark);
        input.focus();
    });
}

// 比例数独有效性检测函数
export function is_valid_ratio(board, size, row, col, num) {
    // 1. 常规区域判断（与普通数独一致）
    const mode = state.current_mode || 'ratio';
    const regions = get_all_regions(size, mode);
    for (const region of regions) {
        if (region.cells.some(([r, c]) => r === row && c === col)) {
            for (const [r, c] of region.cells) {
                if ((r !== row || c !== col) && board[r][c] === num) {
                    return false;
                }
            }
        }
    }

    // 2. 比例标记判断
    const container = document.querySelector('.sudoku-container');
    const marks = container ? container.querySelectorAll('.vx-mark') : [];
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

        // 判断当前格是否在标记两格之一
        let other_cell, this_cell_pos;
        if (row === cell_a[0] && col === cell_a[1]) {
            this_cell_pos = 'A';
            other_cell = cell_b;
        } else if (row === cell_b[0] && col === cell_b[1]) {
            this_cell_pos = 'B';
            other_cell = cell_a;
        } else {
            continue; // 当前格与此标记无关
        }

        // 获取当前格和另一格的值
        const this_value = num;
        const other_value = board[other_cell[0]] && board[other_cell[0]][other_cell[1]];

        // 只有两个格子都填了确定数字才检查合法性，否则跳过
        // 判断：必须是数字且大于0，且不是数组（即不是候选数模式）
        if (
            // typeof this_value !== 'number' || this_value <= 0 || Array.isArray(this_value) ||
            typeof other_value !== 'number' || other_value <= 0 || Array.isArray(other_value)
        ) continue;

        // 判断比例关系
        if (left_num && right_num) {
            // 例如 1/2，A格:1，B格:2 或 A格:2，B格:1
            if (
                !(
                    (this_value * right_num === other_value * left_num) ||
                    (other_value * right_num === this_value * left_num)
                )
            ) {
                return false;
            }
        }
    }

    return true;
}