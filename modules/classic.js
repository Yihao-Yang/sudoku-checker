import { create_skyscraper_sudoku } from './skyscraper.js';
import { create_vx_sudoku } from './vx.js';
import { create_candidates_sudoku } from './candidates.js';
import { state } from './state.js';
import { 
    show_result, 
    clear_result, 
    clear_outer_clues, 
    bold_border, 
    add_Extra_Button,
    create_base_grid,
    create_base_cell,
    add_base_input_handlers,
    handle_key_navigation,
    base_solve,
    fill_solution
} from './core.js';

// 最关键的创建数独函数
export function create_sudoku_grid(size) {
    state.is_skyscraper_mode = false;
    state.is_vx_mode = false;
    state.is_candidates_mode = false;
    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');
    state.current_grid_size = size;

    const { container, grid } = create_base_grid(size);
    const inputs = Array.from({ length: size }, () => new Array(size));

    // 添加切换候选数模式按钮事件 (保持原状)
    document.getElementById('toggleCandidatesMode').addEventListener('click', function() {
        state.is_candidates_mode = !state.is_candidates_mode;
        this.textContent = state.is_candidates_mode ? '退出候选数模式' : '切换候选数模式';
        
        // 更新所有单元格的显示
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const cell = inputs[row][col].parentElement;
                const mainInput = inputs[row][col];
                const candidatesGrid = cell.querySelector('.candidates-grid');
                
                if (state.is_candidates_mode) {
                    // 切换到候选数模式
                    mainInput.style.display = 'block';
                    mainInput.classList.add('hide-input-text');
                    candidatesGrid.style.display = 'grid';
                    
                    // 更新候选数显示
                    updateCandidatesDisplay(mainInput, candidatesGrid, size);
                } else {
                    // 切换回普通模式
                    mainInput.style.display = 'block';
                    mainInput.classList.remove('hide-input-text');
                    candidatesGrid.style.display = 'none';
                }
            }
        }
    });
    
    // 辅助函数：更新候选数显示 (保持原状)
    function updateCandidatesDisplay(mainInput, candidatesGrid, size) {
        const inputNumbers = [...new Set(mainInput.value.split(''))]
            .map(Number)
            .filter(n => !isNaN(n) && n >= 1 && n <= size);
        
        candidatesGrid.querySelectorAll('.candidates-cell').forEach(cell => {
            const num = parseInt(cell.dataset.number);
            cell.style.display = inputNumbers.includes(num) ? 'flex' : 'none';
        });
    }

    for (let i = 0; i < size * size; i++) {
        const row = Math.floor(i / size);
        const col = i % size;

        // 创建单元格容器
        const cell = document.createElement('div');
        cell.className = 'sudoku-cell';
        cell.dataset.row = row;
        cell.dataset.col = col;

        // 创建主输入框
        const mainInput = document.createElement('input');
        mainInput.type = 'text';
        mainInput.className = 'main-input';
        mainInput.maxLength = size;
        mainInput.dataset.row = row;
        mainInput.dataset.col = col;

        // 创建候选数容器 (保持原状)
        const candidatesGrid = document.createElement('div');
        candidatesGrid.className = 'candidates-grid';
        candidatesGrid.style.display = 'none';

        // 根据数独尺寸创建候选数格子 (保持原状)
        const subSize = Math.sqrt(size);
        candidatesGrid.style.gridTemplateColumns = `repeat(${subSize}, 1fr)`;
        candidatesGrid.style.gridTemplateRows = `repeat(${subSize}, 1fr)`;
        
        for (let n = 1; n <= size; n++) {
            const candidateCell = document.createElement('div');
            candidateCell.className = 'candidates-cell';
            candidateCell.dataset.number = n;
            candidateCell.textContent = n;
            candidateCell.style.display = 'none';
            candidateCell.style.gridArea = getGridArea(n, subSize);
            candidatesGrid.appendChild(candidateCell);
        }

        // 辅助函数：计算固定位置 (保持原状)
        function getGridArea(number, subSize) {
            const row = Math.ceil(number / subSize);
            const col = ((number - 1) % subSize) + 1;
            return `${row} / ${col} / ${row} / ${col}`;
        }

        // 添加元素到DOM
        cell.appendChild(mainInput);
        cell.appendChild(candidatesGrid);
        
        // 存储输入框引用
        inputs[row][col] = mainInput;

        // 输入事件处理 (保持原状)
        mainInput.addEventListener('input', function() {
            const maxValue = size;
            const regex = new RegExp(`[^1-${maxValue}]`, 'g');
            this.value = this.value.replace(regex, '');
            
            const inputNumbers = [...new Set(this.value.split(''))]
                .filter(c => c >= '1' && c <= maxValue.toString())
                .map(Number)
                .sort((a, b) => a - b);
            
            if (state.is_candidates_mode) {
                this.style.display = 'block';
                candidatesGrid.style.display = 'grid';
                
                cell.querySelectorAll('.candidates-cell').forEach(cell => {
                    const num = parseInt(cell.dataset.number);
                    cell.style.display = inputNumbers.includes(num) ? 'flex' : 'none';
                });
                
                this.value = inputNumbers.join('');
                this.classList.add('hide-input-text'); 
            } else {
                this.style.display = 'block';
                candidatesGrid.style.display = 'none';
                
                if (inputNumbers.length === 1) {
                    this.value = inputNumbers[0];
                } else if (inputNumbers.length === 0) {
                    this.value = '';
                }
            }
        });

        // 点击事件 (保持原状)
        cell.addEventListener('click', function() {
            if (state.is_candidates_mode && mainInput.style.display === 'none') {
                mainInput.style.display = 'block';
                candidatesGrid.style.display = 'none';
                mainInput.focus();
                mainInput.select();
            }
        });

        // 键盘事件监听 (保持原状)
        mainInput.addEventListener('keydown', function(e) {
            if (e.key >= '1' && e.key <= size.toString()) {
                if (state.is_candidates_mode) {
                    e.preventDefault();
                    const num = parseInt(e.key);
                    const currentNumbers = [...new Set(this.value.split('').map(Number))];
                    
                    const newNumbers = currentNumbers.includes(num)
                        ? currentNumbers.filter(n => n !== num)
                        : [...currentNumbers, num].sort((a, b) => a - b);
                    
                    this.value = newNumbers.join('');
                    this.dispatchEvent(new Event('input'));
                } else {
                    if (this.value) {
                        this.value = '';
                    }
                }
            }
            else if (e.key === 'Backspace') {
                if (state.is_candidates_mode && mainInput.style.display === 'none') {
                    e.preventDefault();
                    mainInput.style.display = 'block';
                    candidatesGrid.style.display = 'none';
                    mainInput.focus();
                    mainInput.select();
                }
            }
            // 使用核心导航函数
            handle_key_navigation(e, row, col, size, inputs);
        });

        // 加粗边框
        bold_border(cell, row, col, size);

        grid.appendChild(cell);
    }

    container.appendChild(grid);
    gridDisplay.appendChild(container);

    // 添加额外功能按钮
    const extraButtons = document.getElementById('extraButtons');
    extraButtons.innerHTML = '';

    if (size === 4) {
        add_Extra_Button('四宫乘积', () => show_result('这是四宫乘积的功能！(待实现)'));
        add_Extra_Button('四宫摩天楼', () => create_skyscraper_sudoku(4));
        add_Extra_Button('四宫候选数', () => create_candidates_sudoku(4));
    } else if (size === 6) {
        add_Extra_Button('六宫乘积', () => show_result('这是六宫乘积的功能！(待实现)'));
        add_Extra_Button('六宫摩天楼', () => create_skyscraper_sudoku(6));
        add_Extra_Button('六宫候选数', () => create_candidates_sudoku(6));
    } else if (size === 9) {
        add_Extra_Button('九宫乘积', () => show_result('这是九宫乘积的功能！(待实现)'));
        add_Extra_Button('九宫摩天楼', () => create_skyscraper_sudoku(9));
        add_Extra_Button('九宫候选数', () => create_candidates_sudoku(9));
        add_Extra_Button('九宫VX', () => create_vx_sudoku(9));
    }
}

export function check_uniqueness() {
    const container = document.querySelector('.sudoku-container');
    const size = state.current_grid_size;
    let board = Array.from({ length: size }, (_, i) =>
        Array.from({ length: size }, (_, j) => {
            const val = parseInt(container.querySelector(`input[data-row="${i}"][data-col="${j}"]`).value);
            return isNaN(val) ? 0 : val;
        })
    );

    function isValid(row, col, num) {
        for (let i = 0; i < size; i++) {
            if (board[row][i] === num || board[i][col] === num) return false;
        }

        const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
        const startRow = Math.floor(row / boxSize[0]) * boxSize[0];
        const startCol = Math.floor(col / boxSize[1]) * boxSize[1];

        for (let r = startRow; r < startRow + boxSize[0]; r++) {
            for (let c = startCol; c < startCol + boxSize[1]; c++) {
                if (board[r][c] === num) return false;
            }
        }
        return true;
    }

    const { solutionCount, solution } = base_solve(board, size, isValid, true);

    if (solutionCount === 0) {
        show_result("当前数独无解！");
    } else if (solutionCount === 1) {
        fill_solution(container, solution, size);
        show_result("当前数独恰好有唯一解！已自动填充答案。");
    } else if (solutionCount > 100) {
        show_result("当前数独有多于100个解。");
    } else {
        show_result(`当前数独有${solutionCount}个解！`);
    }
}
