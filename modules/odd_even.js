import { state, set_current_mode } from './state.js';
import { create_base_grid, create_base_cell, add_Extra_Button, log_process, backup_original_board, restore_original_board, handle_key_navigation } from './core.js';
import { generate_puzzle } from '../solver/generate.js';
import { get_all_regions, solve } from '../solver/solver_tool.js';
import { create_technique_panel } from './classic.js';

// 奇偶数独主入口
export function create_odd_even_sudoku(size) {
    set_current_mode('odd_even');
    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');
    state.current_grid_size = size;

    // 修改技巧开关
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
        };
        // 唯余法全部默认开启
        for (let i = 1; i <= size; i++) {
            state.techniqueSettings[`Cell_Elimination_${i}`] = true;
        }

        // 刷新技巧面板
        create_technique_panel();

    // 创建基础数独盘面
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
        
    }

    container.appendChild(grid);
    gridDisplay.appendChild(container);

    // // 添加奇偶标记功能
    add_odd_even_mark(size);

    // 奇偶数独专属按钮
    const extra_buttons = document.getElementById('extraButtons');
    extra_buttons.innerHTML = '';
    // add_Extra_Button('添加标记', () => add_odd_even_mark(size));
    add_Extra_Button('自动出题', () => generate_odd_even_puzzle(size), '#2196F3');
}

// 自动生成奇偶数独题目（生成若干奇偶标记并调用generate_puzzle）
export function generate_odd_even_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    // 清除已有奇偶标记
    const grid = document.querySelector('.sudoku-grid');
    if (!grid) return;
    Array.from(grid.querySelectorAll('.odd_even-mark')).forEach(mark => mark.remove());

    let odd_even_marks_count = undefined; // 可选参数：奇偶标记数量
    // 按宫大小调整奇偶标记数量
    if (size === 4) {
        odd_even_marks_count = Math.floor(Math.random() * (4 - 2 + 1)) + 2; // 2-4
    } else if (size === 6) {
        odd_even_marks_count = Math.floor(Math.random() * (12 - 6 + 1)) + 6; // 6-12
    } else if (size === 9) {
        odd_even_marks_count = Math.floor(Math.random() * (28 - 10 + 1)) + 10; // 10-28
    } else {
        odd_even_marks_count = Math.max(2, Math.floor(size * size / 5));
    }

    // 选取对称类型
    const SYMMETRY_TYPES = [
        'central','central','central','central','central',
        'diagonal','diagonal',
        'anti-diagonal','anti-diagonal',
        'horizontal',
        'vertical',
        // 'none'
    ];
    const symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];

    // 获取对称点
    function get_symmetric(row, col, size, symmetry) {
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
                return null;
        }
    }

    // 随机生成奇偶标记位置（不重复，带对称，每次添加后判断有解）
    const positions_set = new Set();
    let marks_added = 0;
    let try_limit = 1000; // 防止死循环
    while (marks_added < odd_even_marks_count && try_limit-- > 0) {
        let row = Math.floor(Math.random() * size);
        let col = Math.floor(Math.random() * size);
        const sym = get_symmetric(row, col, size, symmetry);

        if (positions_set.has(`${row},${col}`) || positions_set.has(`${sym[0]},${sym[1]}`)) continue;

        // 添加标记
        const cell1 = grid.querySelector(`.sudoku-cell[data-row="${row}"][data-col="${col}"]`);
        const cell2 = grid.querySelector(`.sudoku-cell[data-row="${sym[0]}"][data-col="${sym[1]}"]`);
        add_odd_even_mark_to_cell(cell1, Math.random() < 0.5 ? 'circle' : 'square');
        if (row !== sym[0] || col !== sym[1]) add_odd_even_mark_to_cell(cell2, Math.random() < 0.5 ? 'circle' : 'square');

        // 检查是否有解
        let board = [];
        for (let r = 0; r < size; r++) {
            board[r] = [];
            for (let c = 0; c < size; c++) {
                board[r][c] = 0;
            }
        }
        backup_original_board();
        const result = solve(board.map(r => r.map(cell => cell === 0 ? [...Array(size)].map((_, n) => n + 1) : cell)), size, is_valid_odd_even, true);
        

        if (result.solution_count === 0 || result.solution_count === -2) {
            restore_original_board();
            // 无解，撤销标记
            if (cell1) {
                const mark1 = cell1.querySelector('.odd_even-mark');
                if (mark1) mark1.remove();
            }
            if (cell2 && (row !== sym[0] || col !== sym[1])) {
                const mark2 = cell2.querySelector('.odd_even-mark');
                if (mark2) mark2.remove();
            }
            continue;
        }
        if (result.solution_count === 1) {
            positions_set.add(`${row},${col}`);
            positions_set.add(`${sym[0]},${sym[1]}`);
            marks_added += (row === sym[0] && col === sym[1]) ? 1 : 2;
            break;
        }
        positions_set.add(`${row},${col}`);
        positions_set.add(`${sym[0]},${sym[1]}`);
        marks_added += (row === sym[0] && col === sym[1]) ? 1 : 2;
    }

    // 生成题目
    generate_puzzle(size, score_lower_limit, holes_count);

    // 辅助函数：在指定格添加奇偶标记
    function add_odd_even_mark_to_cell(cell, markType = 'circle') {
        if (!cell || cell.querySelector('.odd_even-mark')) return;
        const newMark = document.createElement('div');
        newMark.className = 'odd_even-mark';
        newMark.dataset.markType = markType;
        newMark.style.position = 'absolute';
        newMark.style.left = '50%';
        newMark.style.top = '50%';
        newMark.style.transform = 'translate(-50%, -50%)';
        newMark.style.width = '48px';
        newMark.style.height = '48px';
        newMark.style.zIndex = '1';
        newMark.style.pointerEvents = 'none';
        if (markType === 'circle') {
            newMark.style.borderRadius = '50%';
            newMark.style.background = '#e0e0e0';
        } else {
            newMark.style.borderRadius = '10%';
            newMark.style.background = '#e0e0e0';
        }
        cell.appendChild(newMark);
    }
}

// 添加奇偶标记功能
function add_odd_even_mark(size) {
    const grid = document.querySelector('.sudoku-grid');
    if (!grid) return;

    // 防止重复添加监听
    if (grid._odd_evenMarkMode) return;
    grid._odd_evenMarkMode = true;

    grid.addEventListener('dblclick', function handler(e) {
        // 只响应单元格点击
        const cell = e.target.closest('.sudoku-cell');
        if (!cell) return;

        const mark = cell.querySelector('.odd_even-mark');
        if (!mark) {
            // 没有标记则添加圆圈
            const newMark = document.createElement('div');
            newMark.className = 'odd_even-mark';
            newMark.dataset.markType = 'circle';
            newMark.style.position = 'absolute';
            newMark.style.left = '50%';
            newMark.style.top = '50%';
            newMark.style.transform = 'translate(-50%, -50%)';
            newMark.style.width = '48px';
            newMark.style.height = '48px';
            newMark.style.borderRadius = '50%';
            newMark.style.background = '#e0e0e0';
            newMark.style.zIndex = '1';
            newMark.style.pointerEvents = 'none';
            cell.appendChild(newMark);
        } else if (mark.dataset.markType === 'circle') {
            // 圆圈变方框
            mark.style.borderRadius = '10%';
            mark.dataset.markType = 'square';
        } else if (mark.dataset.markType === 'square') {
            // 方框则删除
            mark.remove();
        }
    });
}

// 应用所有奇偶标记：有 odd_even-mark 的格子只能填入奇偶
export function apply_odd_even_marks(board, size) {
    const grid = document.querySelector('.sudoku-grid');
    if (!grid) return;
    const cells = grid.querySelectorAll('.sudoku-cell');
    for (const cell of cells) {
        const mark = cell.querySelector('.odd_even-mark');
        if (mark) {
            // 获取该格的坐标
            const row = parseInt(cell.getAttribute('data-row'));
            const col = parseInt(cell.getAttribute('data-col'));
            if (isNaN(row) || isNaN(col)) continue;
            // 根据标记类型筛选候选
            if (Array.isArray(board[row][col])) {
                if (mark.dataset.markType === 'circle') {
                    board[row][col] = board[row][col].filter(n => n % 2 === 1); // 只保留奇数
                } else if (mark.dataset.markType === 'square') {
                    board[row][col] = board[row][col].filter(n => n % 2 === 0); // 只保留偶数
                }
            }
        }
    }
}

// 奇偶数独有效性检测函数
export function is_valid_odd_even(board, size, row, col, num) {
    // 1. 常规区域判断（与普通数独一致）
    const mode = state.current_mode || 'odd_even';
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

    // 2. 奇偶标记判断
    const grid = document.querySelector('.sudoku-grid');
    if (grid) {
        const cell = grid.querySelector(`.sudoku-cell[data-row="${row}"][data-col="${col}"]`);
        const mark = cell ? cell.querySelector('.odd_even-mark') : null;
        if (mark) {
            if (mark.dataset.markType === 'circle' && num % 2 !== 1) return false;   // 圆圈只能填奇数
            if (mark.dataset.markType === 'square' && num % 2 !== 0) return false;   // 方框只能填偶数
        }
    }

    return true;
}