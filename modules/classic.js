import { create_skyscraper_sudoku } from './skyscraper.js';
import { create_vx_sudoku } from './vx.js';
import { create_candidates_sudoku } from './candidates.js';
import { create_consecutive_sudoku } from './consecutive.js';
import { create_missing_sudoku } from './missing.js';
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
    fill_solution,
    log_process,
    backup_original_board,
    change_Candidates_Mode
} from './core.js';

// 最关键的创建数独函数
export function create_sudoku_grid(size) {
    state.is_skyscraper_mode = false;
    state.is_vx_mode = false;
    state.is_candidates_mode = false;
    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');
    state.current_grid_size = size;

    // 移除旧的事件监听器
    const toggleBtn = document.getElementById('toggleCandidatesMode');
    const newToggleBtn = toggleBtn.cloneNode(true);
    toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);

    const { container, grid } = create_base_grid(size);
    const inputs = Array.from({ length: size }, () => new Array(size));

    // 创建技巧开关面板
    create_technique_panel();

    // 添加切换候选数模式按钮事件 (保持原状)
    document.getElementById('toggleCandidatesMode').addEventListener('click', function() {
        state.is_candidates_mode = !state.is_candidates_mode;
        this.textContent = state.is_candidates_mode ? '退出候选数模式' : '切换候选数模式';

        change_Candidates_Mode(inputs, state.current_grid_size, state.is_candidates_mode);
    });


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
        // const subSize = Math.sqrt(size);
        // candidatesGrid.style.gridTemplateColumns = `repeat(${subSize}, 1fr)`;
        // candidatesGrid.style.gridTemplateRows = `repeat(${subSize}, 1fr)`;
        const subSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)]; // 六宫格特殊处理
        candidatesGrid.style.gridTemplateColumns = `repeat(${subSize[1]}, 1fr)`;
        candidatesGrid.style.gridTemplateRows = `repeat(${subSize[0]}, 1fr)`;
        
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
        // function getGridArea(number, subSize) {
        //     const row = Math.ceil(number / subSize);
        //     const col = ((number - 1) % subSize) + 1;
        //     return `${row} / ${col} / ${row} / ${col}`;
        // }
        function getGridArea(number, subSize) {
            if (size === 6) {
                // 六宫格特殊布局 (2行3列)
                const row = Math.ceil(number / subSize[1]);
                const col = ((number - 1) % subSize[1]) + 1;
                return `${row} / ${col} / ${row} / ${col}`;
            } else {
                // 标准正方形宫格布局
                const row = Math.ceil(number / subSize[0]);
                const col = ((number - 1) % subSize[0]) + 1;
                return `${row} / ${col} / ${row} / ${col}`;
            }
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
        add_Extra_Button('乘积', () => show_result('这是四宫乘积的功能！(待实现)'));
        add_Extra_Button('摩天楼', () => create_skyscraper_sudoku(4));
        add_Extra_Button('候选数', () => create_candidates_sudoku(4));
        add_Extra_Button('连续', () => create_consecutive_sudoku(4));
        add_Extra_Button('缺一门', () => create_missing_sudoku(4));
    } else if (size === 6) {
        add_Extra_Button('乘积', () => show_result('这是六宫乘积的功能！(待实现)'));
        add_Extra_Button('摩天楼', () => create_skyscraper_sudoku(6));
        add_Extra_Button('候选数', () => create_candidates_sudoku(6));
        add_Extra_Button('连续', () => create_consecutive_sudoku(6));
        add_Extra_Button('缺一门', () => create_missing_sudoku(6));
    } else if (size === 9) {
        add_Extra_Button('乘积', () => show_result('这是九宫乘积的功能！(待实现)'));
        add_Extra_Button('摩天楼', () => create_skyscraper_sudoku(9));
        add_Extra_Button('候选数', () => create_candidates_sudoku(9));
        add_Extra_Button('VX', () => create_vx_sudoku(9));
        add_Extra_Button('连续', () => create_consecutive_sudoku(9));
        add_Extra_Button('缺一门', () => create_missing_sudoku(9));
    }
}

// 创建技巧开关面板
function create_technique_panel() {
    const panel = document.createElement('div');
    panel.id = 'techniquePanel';
    panel.style.position = 'absolute';  // 改为绝对定位
    // panel.style.position = 'fixed';
    panel.style.left = 'calc(50% - 550px)';  // 放在数独容器右侧
    // panel.style.left = '20px';
    panel.style.top = '290px';  // 与数独容器顶部对齐
    // panel.style.top = '100px';
    panel.style.width = '200px';
    panel.style.backgroundColor = '#f5f5f5';
    panel.style.padding = '10px';
    panel.style.borderRadius = '5px';
    panel.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    panel.style.zIndex = '1000';

    // 移除旧的技巧面板（如果存在）
    const oldPanel = document.getElementById('techniquePanel');
    if (oldPanel) {
        oldPanel.remove();
    }
    const title = document.createElement('h3');
    title.textContent = '技巧开关';
    title.style.marginTop = '0';
    panel.appendChild(title);

    // 技巧列表
    const techniqueGroups = [
        {
            id: 'elimination',
            items: [
                { id: 'Box_Elimination', name: '宫排除', default: true },
                { id: 'Row_Col_Elimination', name: '行列排除', default: true }
            ]
        },
        {
            id: 'block',
        items: [
            { id: 'Box_Block', name: '宫区块', default: true },
            { id: 'Row_Col_Block', name: '行列区块', default: true }
        ]
        },
        {
            id: 'pair',
            items: [
                // 隐性数对
                { id: 'Box_Hidden_Pair', name: '宫隐性数对', default: true },
                { id: 'Row_Col_Hidden_Pair', name: '行列隐性数对', default: true },
                // 显性数对
                { id: 'Box_Naked_Pair', name: '宫显性数对', default: true },
                { id: 'Row_Col_Naked_Pair', name: '行列显性数对', default: true }
            ]
        },
        {
            id: 'subset',
            items: [
                // 隐性数组
                { id: 'Box_Hidden_Triple', name: '宫隐性三数组', default: true },
                { id: 'Row_Col_Hidden_Triple', name: '行列隐性三数组', default: true },
                // { id: 'Box_Hidden_Quad', name: '宫隐性四数组', default: true },
                // { id: 'Row_Col_Hidden_Quad', name: '行列隐性四数组', default: true },
                // 显性数组
                { id: 'Box_Naked_Triple', name: '宫显性三数组', default: true },
                { id: 'Row_Col_Naked_Triple', name: '行列显性三数组', default: true },
                // { id: 'Box_Naked_Quad', name: '宫显性四数组', default: true },
                // { id: 'Row_Col_Naked_Quad', name: '行列显性四数组', default: true }
                // 合并所有四数组为一个开关
                { id: 'All_Quad', name: '四数组(显性+隐性)', default: true },
            ]
        },
        {
            id: 'cell',
            items: [
                { id: 'Cell_Elimination', name: '唯余', default: true }
            ]
        },
        {
            id: 'bruteForce',
            items: [
                { id: 'Brute_Force', name: '暴力求解', default: false }
            ]
        }
    ];

    // 初始化技巧状态
    if (!state.techniqueSettings) {
        state.techniqueSettings = {
            Box_Elimination: true,
            Row_Elimination: true,
            Col_Elimination: true,
            Box_Block: true,
            Row_Block: true,
            Col_Block: true,
            Box_Naked_Pair: true,
            Row_Naked_Pair: true,
            Col_Naked_Pair: true,
            Box_Naked_Triple: true,
            Row_Naked_Triple: true,
            Col_Naked_Triple: true,
            // Row_Naked_Quad: true,
            // Col_Naked_Quad: true,
            Box_Hidden_Pair: true,
            Row_Hidden_Pair: true,
            Col_Hidden_Pair: true,
            Box_Hidden_Triple: true,
            Row_Hidden_Triple: true,
            Col_Hidden_Triple: true,
            // Row_Hidden_Quad: true,
            // Col_Hidden_Quad: true,
            // All_Quad: true,
            Box_Hidden_Quad: true,
            Row_Hidden_Quad: true,
            Col_Hidden_Quad: true,
            Box_Naked_Quad: true,
            Row_Naked_Quad: true,
            Col_Naked_Quad: true,
            Brute_Force: false
        };
        techniqueGroups.forEach(group => {
            group.items.forEach(tech => {
                state.techniqueSettings[tech.id] = tech.default;
            });
        });
    }

    // 创建开关控件
    techniqueGroups.forEach(group => {
        // 添加分组标题
        if (group.name) {
            const groupTitle = document.createElement('h4');
            groupTitle.textContent = group.name;
            groupTitle.style.margin = '10px 0 5px 0';
            groupTitle.style.fontSize = '14px';
            panel.appendChild(groupTitle);
        }

        // 添加总开关（排除、区块、数组才有）
        if (group.id) {
            const masterDiv = document.createElement('div');
            masterDiv.style.margin = '5px 0';
            masterDiv.style.display = 'flex';
            masterDiv.style.alignItems = 'center';

            const masterCheckbox = document.createElement('input');
            masterCheckbox.type = 'checkbox';
            masterCheckbox.id = `tech_master_${group.id}`;
            masterCheckbox.checked = group.items.every(tech => state.techniqueSettings[tech.id]);
            masterCheckbox.style.marginRight = '10px';

            masterCheckbox.addEventListener('change', () => {
                const newValue = masterCheckbox.checked;
                group.items.forEach(tech => {
                    state.techniqueSettings[tech.id] = newValue;
                    const checkbox = document.getElementById(`tech_${tech.id}`);
                    if (checkbox) checkbox.checked = newValue;
                    
                    // 处理行列排除/区块/数组的特殊情况
                    if (tech.id === 'Row_Col_Elimination') {
                        state.techniqueSettings.Row_Elimination = newValue;
                        state.techniqueSettings.Col_Elimination = newValue;
                    } else if (tech.id === 'Row_Col_Block') {
                        state.techniqueSettings.Row_Block = newValue;
                        state.techniqueSettings.Col_Block = newValue;
                    } else if (tech.id === 'Row_Col_Hidden_Pair') {
                        state.techniqueSettings.Row_Hidden_Pair = newValue;
                        state.techniqueSettings.Col_Hidden_Pair = newValue;
                    } else if (tech.id === 'Row_Col_Hidden_Triple') {
                        state.techniqueSettings.Row_Hidden_Triple = newValue;
                        state.techniqueSettings.Col_Hidden_Triple = newValue;
                    } else if (tech.id === 'Row_Col_Naked_Pair') {
                        state.techniqueSettings.Row_Naked_Pair = newValue;
                        state.techniqueSettings.Col_Naked_Pair = newValue;
                    } else if (tech.id === 'Row_Col_Naked_Triple') {
                        state.techniqueSettings.Row_Naked_Triple = newValue;
                        state.techniqueSettings.Col_Naked_Triple = newValue;
                    } else if (tech.id === 'All_Quad') {
                        state.techniqueSettings.Box_Hidden_Quad = newValue;
                        state.techniqueSettings.Row_Hidden_Quad = newValue;
                        state.techniqueSettings.Col_Hidden_Quad = newValue;
                        state.techniqueSettings.Box_Naked_Quad = newValue;
                        state.techniqueSettings.Row_Naked_Quad = newValue;
                        state.techniqueSettings.Col_Naked_Quad = newValue;
                    }
                });
            });

            const masterLabel = document.createElement('label');
            masterLabel.htmlFor = `tech_master_${group.id}`;
            masterLabel.textContent = `${group.id === 'elimination' ? '排除' : 
                                    group.id === 'block' ? '区块' :
                                    group.id === 'pair' ? '数对' :
                                    group.id === 'subset' ? '数组' :
                                    group.id === 'cell' ? '唯余' : '暴力'}`;
            masterLabel.style.fontWeight = 'bold';

            masterDiv.appendChild(masterCheckbox);
            masterDiv.appendChild(masterLabel);
            panel.appendChild(masterDiv);
        }

        // 添加子技巧开关
        group.items.forEach(tech => {
            const div = document.createElement('div');
            div.style.margin = group.id ? '5px 0 5px 20px' : '5px 0';
            div.style.display = 'flex';
            div.style.alignItems = 'center';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `tech_${tech.id}`;
            checkbox.checked = state.techniqueSettings[tech.id];
            checkbox.style.marginRight = '10px';

            checkbox.addEventListener('change', () => {
                state.techniqueSettings[tech.id] = checkbox.checked;
                
                // 更新总开关状态
                if (group.id) {
                    const masterCheckbox = document.getElementById(`tech_master_${group.id}`);
                    if (masterCheckbox) {
                        masterCheckbox.checked = group.items.every(
                            t => state.techniqueSettings[t.id]
                        );
                    }
                }
                
                // 处理行列排除/区块/数组的特殊情况
                if (tech.id === 'Row_Col_Elimination') {
                    state.techniqueSettings.Row_Elimination = checkbox.checked;
                    state.techniqueSettings.Col_Elimination = checkbox.checked;
                } else if (tech.id === 'Row_Col_Block') {
                    state.techniqueSettings.Row_Block = checkbox.checked;
                    state.techniqueSettings.Col_Block = checkbox.checked;
                } else if (tech.id === 'Row_Col_Hidden_Pair') {
                    state.techniqueSettings.Row_Hidden_Pair = checkbox.checked;
                    state.techniqueSettings.Col_Hidden_Pair = checkbox.checked;
                } else if (tech.id === 'Row_Col_Hidden_Triple') {
                    state.techniqueSettings.Row_Hidden_Triple = checkbox.checked;
                    state.techniqueSettings.Col_Hidden_Triple = checkbox.checked;
                } else if (tech.id === 'Row_Col_Naked_Pair') {
                    state.techniqueSettings.Row_Naked_Pair = checkbox.checked;
                    state.techniqueSettings.Col_Naked_Pair = checkbox.checked;
                } else if (tech.id === 'Row_Col_Naked_Triple') {
                    state.techniqueSettings.Row_Naked_Triple = checkbox.checked;
                    state.techniqueSettings.Col_Naked_Triple = checkbox.checked;
                } else if (tech.id === 'All_Quad') {
                    state.techniqueSettings.Box_Hidden_Quad = checkbox.checked;
                    state.techniqueSettings.Row_Hidden_Quad = checkbox.checked;
                    state.techniqueSettings.Col_Hidden_Quad = checkbox.checked;
                    state.techniqueSettings.Box_Naked_Quad = checkbox.checked;
                    state.techniqueSettings.Row_Naked_Quad = checkbox.checked;
                    state.techniqueSettings.Col_Naked_Quad = checkbox.checked;
                }
            });

            const label = document.createElement('label');
            label.htmlFor = `tech_${tech.id}`;
            label.textContent = tech.name;

            div.appendChild(checkbox);
            div.appendChild(label);
            panel.appendChild(div);
        });
    });

    document.body.appendChild(panel);
    // // 将面板添加到数独容器中而不是body
    // const gridDisplay = document.getElementById('gridDisplay');
    // gridDisplay.appendChild(panel);
    // 添加一个包装容器来保持相对定位
    gridDisplay.style.position = 'relative';
}