import { create_skyscraper_sudoku } from './skyscraper.js';
import { create_vx_sudoku } from './vx.js';
import { create_candidates_sudoku } from './candidates.js';
import { create_diagonal_sudoku } from './diagonal.js';
import { create_multi_diagonal_sudoku } from './multi_diagonal.js';
import { create_consecutive_sudoku } from './consecutive.js';
import { create_missing_sudoku } from './missing.js';
import { create_window_sudoku } from './window.js';
import { create_pyramid_sudoku } from './pyramid.js';
import { create_isomorphic_sudoku } from './isomorphic.js';
import { create_extra_region_sudoku } from './extra_region.js';
import { create_anti_king_sudoku } from './anti_king.js';
import { create_anti_knight_sudoku } from './anti_knight.js';
import { create_exclusion_sudoku, apply_exclusion_marks, is_valid_exclusion } from './exclusion.js';
import { create_quadruple_sudoku, is_valid_quadruple } from './quadruple.js';
import { create_ratio_sudoku } from './ratio.js';
import { create_odd_sudoku } from './odd.js';
import { create_odd_even_sudoku, is_valid_odd_even } from './odd_even.js';
import { create_palindrome_sudoku } from './palindrome.js';
import { create_new_sudoku } from './new.js';
import { state, set_current_mode } from './state.js';
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
    change_candidates_mode,
    show_logical_solution
} from './core.js';
import { solve, isValid, eliminate_candidates } from '../solver/solver_tool.js';

// 最关键的创建数独函数
export function create_sudoku_grid(size) {
    set_current_mode('classic');
    // 重置候选数模式和解题模式按钮及状态
    state.is_candidates_mode = false;
    state.is_solve_mode = false;
    const toggleCandidatesBtn = document.getElementById('toggleCandidatesMode');
    if (toggleCandidatesBtn) toggleCandidatesBtn.textContent = '进入候选数模式';
    const toggleSolveBtn = document.getElementById('toggleSolveMode');
    if (toggleSolveBtn) toggleSolveBtn.textContent = '进入解题模式';
    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');
    state.current_grid_size = size;

    // // 移除旧的事件监听器
    // const toggleBtn = document.getElementById('toggleCandidatesMode');
    // const newToggleBtn = toggleBtn.cloneNode(true);
    // toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);

    const { container, grid } = create_base_grid(size);
    const inputs = Array.from({ length: size }, () => new Array(size));

    // 修改技巧开关 - 关闭不适合缺一门数独的技巧
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
        Brute_Force: false       
    };
    // 唯余法全部默认开启
    for (let i = 1; i <= 9; i++) {
        state.techniqueSettings[`Cell_Elimination_${i}`] = true;
    }

    // 创建技巧开关面板
    create_technique_panel();

    // // 添加切换候选数模式按钮事件 (保持原状)
    // document.getElementById('toggleCandidatesMode').addEventListener('click', function() {
    // // 判断当前模式，直接设置状态
    //     if (!state.is_candidates_mode) {
    //         state.is_candidates_mode = true;
    //         change_candidates_mode(inputs, state.current_grid_size, false); // 传true表示强制候选数模式
    //         this.textContent = '退出候选数模式';
    //     } else {
    //         state.is_candidates_mode = false;
    //         change_candidates_mode(inputs, state.current_grid_size, false); // 传false表示退出候选数模式
    //         this.textContent = '进入候选数模式';
    //     }
    // });


    for (let i = 0; i < size * size; i++) {
        const row = Math.floor(i / size);
        const col = i % size;

        // 创建单元格容器
        const cell = document.createElement('div');
        cell.className = 'sudoku-cell';
        cell.dataset.row = row;
        cell.dataset.col = col;

        // 创建主输入框
        const main_input = document.createElement('input');
        main_input.type = 'text';
        main_input.className = 'main-input';
        main_input.maxLength = size;
        main_input.dataset.row = row;
        main_input.dataset.col = col;

        // 创建候选数容器
        const candidates_grid = document.createElement('div');
        candidates_grid.className = 'candidates-grid';
        candidates_grid.style.display = 'none';
        // 设置候选数格子布局（和 classic.js 一样）
        const sub_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
        candidates_grid.style.gridTemplateColumns = `repeat(${sub_size[1]}, 1fr)`;
        candidates_grid.style.gridTemplateRows = `repeat(${sub_size[0]}, 1fr)`;
        for (let n = 1; n <= size; n++) {
            const candidate_cell = document.createElement('div');
            candidate_cell.className = 'candidates-cell';
            candidate_cell.dataset.number = n;
            candidate_cell.textContent = n;
            candidate_cell.style.display = 'none';
            candidate_cell.style.gridArea = get_grid_area(n, sub_size);
            candidates_grid.appendChild(candidate_cell);
        }

        function get_grid_area(number, sub_size) {
            if (size === 6) {
                // 六宫格特殊布局 (2行3列)
                const row = Math.ceil(number / sub_size[1]);
                const col = ((number - 1) % sub_size[1]) + 1;
                return `${row} / ${col} / ${row} / ${col}`;
            } else {
                // 标准正方形宫格布局
                const row = Math.ceil(number / sub_size[0]);
                const col = ((number - 1) % sub_size[0]) + 1;
                return `${row} / ${col} / ${row} / ${col}`;
            }
        }

        // 添加元素到DOM
        cell.appendChild(main_input);
        cell.appendChild(candidates_grid);
        grid.appendChild(cell);

        // 存储输入框引用
        inputs[row][col] = main_input;

        // 输入事件处理 (保持原状)
        main_input.addEventListener('input', function() {
            const maxValue = size;
            const regex = new RegExp(`[^1-${maxValue}]`, 'g');
            this.value = this.value.replace(regex, '');
            
            const inputNumbers = [...new Set(this.value.split(''))]
                .filter(c => c >= '1' && c <= maxValue.toString())
                .map(Number)
                .sort((a, b) => a - b);
            
            if (state.is_candidates_mode) {
                this.style.display = 'block';
                candidates_grid.style.display = 'grid';

                cell.querySelectorAll('.candidates-cell').forEach(cell => {
                    const num = parseInt(cell.dataset.number);
                    cell.style.display = inputNumbers.includes(num) ? 'flex' : 'none';
                });
                
                this.value = inputNumbers.join('');
                this.classList.add('hide-input-text'); 
            } else {
                this.style.display = 'block';
                candidates_grid.style.display = 'none';

                if (inputNumbers.length === 1) {
                    this.value = inputNumbers[0];
                } else if (inputNumbers.length === 0) {
                    this.value = '';
                }
            }
        });

        // 点击事件 (保持原状)
        cell.addEventListener('click', function() {
            if (state.is_candidates_mode && main_input.style.display === 'none') {
                main_input.style.display = 'block';
                candidates_grid.style.display = 'none';
                main_input.focus();
                main_input.select();
            }
        });

        // 键盘事件监听 (保持原状)
        main_input.addEventListener('keydown', function(e) {
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
                if (state.is_candidates_mode && main_input.style.display === 'none') {
                    e.preventDefault();
                    main_input.style.display = 'block';
                    candidates_grid.style.display = 'none';
                    main_input.focus();
                    main_input.select();
                }
            }
            // 使用核心导航函数
            handle_key_navigation(e, row, col, size, inputs);
        });

        // 加粗边框
        bold_border(cell, row, col, size);
        // draw_box_lines(cell, size);

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
        add_Extra_Button('对角线', () => create_diagonal_sudoku(4));
        add_Extra_Button('斜线', () => create_multi_diagonal_sudoku(4));
        add_Extra_Button('连续', () => create_consecutive_sudoku(4));
        add_Extra_Button('缺一门', () => create_missing_sudoku(4));
        add_Extra_Button('同位', () => create_isomorphic_sudoku(4));
        add_Extra_Button('额外区域', () => create_extra_region_sudoku(4));
        add_Extra_Button('无马', () => create_anti_knight_sudoku(4));
        add_Extra_Button('排除', () => create_exclusion_sudoku(4));
        add_Extra_Button('四格提示', () => create_quadruple_sudoku(4));
        add_Extra_Button('比例', () => create_ratio_sudoku(4));
        add_Extra_Button('奇数', () => create_odd_sudoku(4));
        add_Extra_Button('奇偶', () => create_odd_even_sudoku(4));
        add_Extra_Button('回文', () => create_palindrome_sudoku(4));
        add_Extra_Button('新', () => create_new_sudoku(4));
    } else if (size === 6) {
        add_Extra_Button('乘积', () => show_result('这是六宫乘积的功能！(待实现)'));
        add_Extra_Button('摩天楼', () => create_skyscraper_sudoku(6));
        add_Extra_Button('候选数', () => create_candidates_sudoku(6));
        add_Extra_Button('对角线', () => create_diagonal_sudoku(6));
        add_Extra_Button('斜线', () => create_multi_diagonal_sudoku(6));
        add_Extra_Button('连续', () => create_consecutive_sudoku(6));
        add_Extra_Button('缺一门', () => create_missing_sudoku(6));
        add_Extra_Button('同位', () => create_isomorphic_sudoku(6));
        add_Extra_Button('额外区域', () => create_extra_region_sudoku(6));
        add_Extra_Button('无缘', () => create_anti_king_sudoku(6));
        add_Extra_Button('无马', () => create_anti_knight_sudoku(6));
        add_Extra_Button('排除', () => create_exclusion_sudoku(6));
        add_Extra_Button('四格提示', () => create_quadruple_sudoku(6));
        add_Extra_Button('比例', () => create_ratio_sudoku(6));
        add_Extra_Button('奇数', () => create_odd_sudoku(6));
        add_Extra_Button('奇偶', () => create_odd_even_sudoku(6));
        add_Extra_Button('回文', () => create_palindrome_sudoku(6));
        add_Extra_Button('新', () => create_new_sudoku(6));
    } else if (size === 9) {
        add_Extra_Button('乘积', () => show_result('这是九宫乘积的功能！(待实现)'));
        add_Extra_Button('摩天楼', () => create_skyscraper_sudoku(9));
        add_Extra_Button('候选数', () => create_candidates_sudoku(9));
        add_Extra_Button('对角线', () => create_diagonal_sudoku(9));
        add_Extra_Button('斜线', () => create_multi_diagonal_sudoku(9));
        add_Extra_Button('VX', () => create_vx_sudoku(9));
        add_Extra_Button('连续', () => create_consecutive_sudoku(9));
        add_Extra_Button('缺一门', () => create_missing_sudoku(9));
        add_Extra_Button('窗口', () => create_window_sudoku(9));
        add_Extra_Button('金字塔', () => create_pyramid_sudoku(9));
        add_Extra_Button('同位', () => create_isomorphic_sudoku(9));
        add_Extra_Button('额外区域', () => create_extra_region_sudoku(9));
        add_Extra_Button('无缘', () => create_anti_king_sudoku(9));
        add_Extra_Button('无马', () => create_anti_knight_sudoku(9));
        add_Extra_Button('排除', () => create_exclusion_sudoku(9));
        add_Extra_Button('四格提示', () => create_quadruple_sudoku(9));
        add_Extra_Button('比例', () => create_ratio_sudoku(9));
        add_Extra_Button('奇数', () => create_odd_sudoku(9));
        add_Extra_Button('奇偶', () => create_odd_even_sudoku(9));
        add_Extra_Button('回文', () => create_palindrome_sudoku(9));
        add_Extra_Button('新', () => create_new_sudoku(9));
    }
}

// 创建技巧开关面板
export function create_technique_panel() {
    const panel = document.createElement('div');
    panel.id = 'techniquePanel';
    panel.style.position = 'absolute';  // 改为绝对定位
    // panel.style.position = 'fixed';
    panel.style.left = 'calc(50% - 550px)';  // 放在数独容器左侧
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
                { id: 'Box_One_Cut', name: '一刀流宫排除', default: true },
                { id: 'Row_Col_Elimination', name: '行列排除', default: true },
                { id: 'Variant_Elimination', name: '变型排除', default: false },
                { id: 'Special_Combination_Region_Elimination', name: '特定组合排除', default: false }
            ]
        },
        {
            id: 'block',
        items: [
            { id: 'Box_Block', name: '宫区块', default: true },
            { id: 'Box_Block_One_Cut', name: '一刀流宫区块', default: true },
            { id: 'Box_Pair_Block', name: '宫组合区块', default: true },
            { id: 'Variant_Pair_Block', name: '变型组合区块', default: false },
            { id: 'Row_Col_Block', name: '行列区块', default: true },
            { id: 'Variant_Block', name: '变型区块', default: false },
            { id: 'Special_Combination_Region_Block', name: '特定组合区块', default: false } // 新增特定组合区块
        ]
        },
        {
            id: 'pair',
            items: [
                // 隐性数对
                { id: 'Box_Hidden_Pair', name: '宫隐性数对', default: true },
                { id: 'Row_Col_Hidden_Pair', name: '行列隐性数对', default: true },
                { id: 'Variant_Hidden_Pair', name: '变型隐性数对', default: state.techniqueSettings?.Variant_Elimination ?? false },
                
                // 显性数对
                { id: 'Box_Naked_Pair', name: '宫显性数对', default: true },
                { id: 'Row_Col_Naked_Pair', name: '行列显性数对', default: true },
                { id: 'Variant_Naked_Pair', name: '变型显性数对', default: state.techniqueSettings?.Variant_Elimination ?? false },
            ]
        },
        {
            id: 'subset',
            items: [
                // 隐性数组
                { id: 'Box_Hidden_Triple', name: '宫隐性三数组', default: true },
                { id: 'Row_Col_Hidden_Triple', name: '行列隐性三数组', default: true },
                { id: 'Variant_Hidden_Triple', name: '变型隐性三数组', default: state.techniqueSettings?.Variant_Elimination ?? false },
                // 显性数组
                { id: 'Box_Naked_Triple', name: '宫显性三数组', default: true },
                { id: 'Row_Col_Naked_Triple', name: '行列显性三数组', default: true },
                { id: 'Variant_Naked_Triple', name: '变型显性三数组', default: state.techniqueSettings?.Variant_Elimination ?? false },
                // 合并所有四数组为一个开关
                { id: 'All_Quad', name: '四数组(显性+隐性)(可能有bug，慎用)', default: false },
            ]
        },
        {
            id: 'cell',
            items: [
                { id: 'Cell_Elimination_1', name: '余1唯余法', default: true },
                { id: 'Cell_Elimination_2', name: '余2唯余法', default: true },
                { id: 'Cell_Elimination_3', name: '余3唯余法', default: true },
                { id: 'Cell_Elimination_4', name: '余4唯余法', default: true },
                { id: 'Cell_Elimination_5', name: '余5唯余法', default: true },
                { id: 'Cell_Elimination_6', name: '余6唯余法', default: true },
                { id: 'Cell_Elimination_7', name: '余7唯余法', default: true },
                { id: 'Cell_Elimination_8', name: '余8唯余法', default: true },
                { id: 'Cell_Elimination_9', name: '余9唯余法', default: true }
            ]
        },
        {
            id: 'bruteForce',
            items: [
                { id: 'Brute_Force', name: '暴力求解', default: false }
            ]
        },
        {
            id: 'missing', // 新增欠一排除分组
            items: [
                { id: 'Missing_One', name: '欠一排除', default: state.current_mode === 'missing' }
            ]
        }
    ];

    // 初始化技巧状态
    if (!state.techniqueSettings) {
        state.techniqueSettings = {
            Box_Elimination: true,
            Box_One_Cut: true,
            Row_Col_Elimination: true,
            Box_Block: true,
            Box_Block_One_Cut: true,
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
            Missing_One: state.current_mode === 'missing',
            // Variant_Elimination: state.current_mode === 'diagonal',
            // Variant_Block: state.current_mode === 'diagonal'
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
                    
                    if (tech.id === 'All_Quad') {
                        state.techniqueSettings.Box_Hidden_Quad = newValue;
                        state.techniqueSettings.Row_Col_Hidden_Quad = newValue;
                        state.techniqueSettings.Box_Naked_Quad = newValue;
                        state.techniqueSettings.Row_Col_Naked_Quad = newValue;
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
                
                if (tech.id === 'All_Quad') {
                    state.techniqueSettings.Box_Hidden_Quad = checkbox.checked;
                    state.techniqueSettings.Row_Col_Hidden_Quad = checkbox.checked;
                    state.techniqueSettings.Box_Naked_Quad = checkbox.checked;
                    state.techniqueSettings.Row_Col_Naked_Quad = checkbox.checked;
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

/**
 * 验证数独的唯一解
 */
export function check_uniqueness() {
    // 清空之前的日志
    log_process('', true);
    state.candidate_elimination_score = {};
    state.total_score_sum = 0;

    const container = document.querySelector('.sudoku-container');
    const size = state.current_grid_size;


    // 备份当前题目状态
    backup_original_board();
    
    // 获取当前数独状态，包括候选数信息
    let board = Array.from({ length: size }, (_, i) =>
        Array.from({ length: size }, (_, j) => {
            const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
            const val = parseInt(input.value);

            // 如果是候选数模式且有候选数，则返回候选数数组，否则返回单个数字或0
            if (state.is_candidates_mode && input.value.length > 1) {
                return [...new Set(input.value.split('').map(Number))].filter(n => n >= 1 && n <= size);
            }
            return isNaN(val) ? Array.from({length: size}, (_, n) => n + 1) : val;
        })
    );
// 新增：应用排除标记
    // if (state.current_mode === 'exclusion') {
    //     apply_exclusion_marks(board, size);
    // }
    // log_process('初始数独状态：');
    // log_process(board.map(row => row.map(cell => Array.isArray(cell) ? `{${cell.join('')}}` : cell).join(' ')).join('\n'));
    // log_process('-----------------------');

    // 判断当前模式，选择不同的有效性检测函数
    let valid_func = isValid;
    const { solution_count, solution } = solve(board, size, valid_func); // 调用主求解函数
    state.solve_stats.solution_count = solution_count;


    // 显示结果
    if (state.solve_stats.solution_count === -1) {
        show_result("当前技巧无法解出");
    } else if (state.solve_stats.solution_count === 0 || state.solve_stats.solution_count === -2) {
        show_result("当前数独无解！");
    } else if (state.solve_stats.solution_count === 1) {
        // 退出候选数模式
        state.is_candidates_mode = false;
        document.getElementById('toggleCandidatesMode').textContent = '进入候选数模式';
        
        // 填充唯一解
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
                const cell = input.parentElement;
                const candidatesGrid = cell.querySelector('.candidates-grid');
                
                // 更新显示状态
                input.style.display = 'block';
                input.classList.remove('hide-input-text');
                if (candidatesGrid) {
                    candidatesGrid.style.display = 'none';
                }
                
                // 填充答案
                if (solution[i][j] > 0) {
                    // 如果是标准数独模式且该格已有数字，则跳过
                    if (!state.is_candidates_mode && input.value) {
                        continue;
                    }
                    input.value = solution[i][j];
                    input.classList.add("solution-cell");
                }
            }
        }
        show_result("当前数独恰好有唯一解！已自动填充答案。");
    } else if (state.solve_stats.solution_count > 1) {
        show_result("当前数独有多个解。");
    } else {
        show_result(`当前数独有${state.solve_stats.solution_count}个解！`);
    }

    show_logical_solution();
}