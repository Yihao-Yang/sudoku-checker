import { create_skyscraper_sudoku } from '../modules/skyscraper.js';
import { create_vx_sudoku } from '../modules/vx.js';
import { create_kropki_sudoku } from '../modules/kropki.js';
import { create_candidates_sudoku } from '../modules/candidates.js';
import { create_diagonal_sudoku } from '../modules/diagonal.js';
import { create_anti_diagonal_sudoku } from '../modules/anti_diagonal.js';
import { create_hashtag_sudoku } from '../modules/hashtag.js';
import { create_multi_diagonal_sudoku } from '../modules/multi_diagonal.js';
import { create_consecutive_sudoku } from '../modules/consecutive.js';
import { create_missing_sudoku } from '../modules/missing.js';
import { create_window_sudoku } from '../modules/window.js';
import { create_pyramid_sudoku } from '../modules/pyramid.js';
import { create_isomorphic_sudoku } from '../modules/isomorphic.js';
import { create_extra_region_sudoku } from '../modules/extra_region.js';
import { create_renban_sudoku } from '../modules/renban.js';
import { create_fortress_sudoku } from '../modules/fortress.js';
import { create_clone_sudoku } from '../modules/clone.js';
import { create_anti_king_sudoku } from '../modules/anti_king.js';
import { create_anti_knight_sudoku } from '../modules/anti_knight.js';
import { create_anti_elephant_sudoku } from '../modules/anti_elephant.js';
import { create_exclusion_sudoku, apply_exclusion_marks, is_valid_exclusion } from '../modules/exclusion.js';
import { create_quadruple_sudoku, is_valid_quadruple } from '../modules/quadruple.js';
import { create_add_sudoku } from '../modules/add.js';
import { create_product_sudoku } from '../modules/product.js';
import { create_ratio_sudoku } from '../modules/ratio.js';
import { create_inequality_sudoku } from '../modules/inequality.js';
import { create_odd_sudoku } from '../modules/odd.js';
import { create_odd_even_sudoku, is_valid_odd_even } from '../modules/odd_even.js';
import { create_palindrome_sudoku } from '../modules/palindrome.js';
import { create_X_sums_sudoku } from '../modules/X_sums.js';
import { create_sandwich_sudoku } from '../modules/sandwich.js';
import { create_new_sudoku } from '../modules/new.js';
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
    fill_solution,
    log_process,
    backup_original_board,
    change_candidates_mode,
    show_logical_solution
} from './core.js';
import { solve, isValid, eliminate_candidates } from './solver_tool.js';

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
    for (let i = 1; i <= size; i++) {
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
                this.classList.add('hide_input_text'); 
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
        add_Extra_Button('候选数', () => create_candidates_sudoku(4));
        add_Extra_Button('对角线', () => create_diagonal_sudoku(4));
        // add_Extra_Button('斜井', () => create_hashtag_sudoku(4));
        add_Extra_Button('斜线', () => create_multi_diagonal_sudoku(4));
        add_Extra_Button('黑白点', () => create_kropki_sudoku(4));
        add_Extra_Button('连续', () => create_consecutive_sudoku(4));
        add_Extra_Button('缺一门', () => create_missing_sudoku(4));
        add_Extra_Button('同位', () => create_isomorphic_sudoku(4));
        add_Extra_Button('额外区域', () => create_extra_region_sudoku(4));
        add_Extra_Button('灰格连续', () => create_renban_sudoku(4));
        add_Extra_Button('堡垒', () => create_fortress_sudoku(4));
        add_Extra_Button('克隆', () => create_clone_sudoku(4));
        add_Extra_Button('无马', () => create_anti_knight_sudoku(4));
        add_Extra_Button('无象', () => create_anti_elephant_sudoku(4));
        add_Extra_Button('排除', () => create_exclusion_sudoku(4));
        add_Extra_Button('四格提示', () => create_quadruple_sudoku(4));
        add_Extra_Button('加法', () => create_add_sudoku(4));
        add_Extra_Button('乘积', () => create_product_sudoku(4));
        add_Extra_Button('比例', () => create_ratio_sudoku(4));
        add_Extra_Button('不等号', () => create_inequality_sudoku(4));
        add_Extra_Button('奇数', () => create_odd_sudoku(4));
        add_Extra_Button('奇偶', () => create_odd_even_sudoku(4));
        add_Extra_Button('回文', () => create_palindrome_sudoku(4));
        add_Extra_Button('摩天楼', () => create_skyscraper_sudoku(4));
        add_Extra_Button('X和', () => create_X_sums_sudoku(4));
        add_Extra_Button('三明治', () => create_sandwich_sudoku(4));
        add_Extra_Button('新', () => create_new_sudoku(4));
    } else if (size === 6) {
        add_Extra_Button('候选数', () => create_candidates_sudoku(6));
        add_Extra_Button('对角线', () => create_diagonal_sudoku(6));
        add_Extra_Button('反对角', () => create_anti_diagonal_sudoku(6));
        add_Extra_Button('斜井', () => create_hashtag_sudoku(6));
        add_Extra_Button('斜线', () => create_multi_diagonal_sudoku(6));
        add_Extra_Button('黑白点', () => create_kropki_sudoku(6));
        add_Extra_Button('连续', () => create_consecutive_sudoku(6));
        add_Extra_Button('缺一门', () => create_missing_sudoku(6));
        add_Extra_Button('同位', () => create_isomorphic_sudoku(6));
        add_Extra_Button('额外区域', () => create_extra_region_sudoku(6));
        add_Extra_Button('灰格连续', () => create_renban_sudoku(6));
        add_Extra_Button('堡垒', () => create_fortress_sudoku(6));
        add_Extra_Button('克隆', () => create_clone_sudoku(6));
        add_Extra_Button('无缘', () => create_anti_king_sudoku(6));
        add_Extra_Button('无马', () => create_anti_knight_sudoku(6));
        add_Extra_Button('无象', () => create_anti_elephant_sudoku(6));
        add_Extra_Button('排除', () => create_exclusion_sudoku(6));
        add_Extra_Button('四格提示', () => create_quadruple_sudoku(6));
        add_Extra_Button('加法', () => create_add_sudoku(6));
        add_Extra_Button('乘积', () => create_product_sudoku(6));
        add_Extra_Button('比例', () => create_ratio_sudoku(6));
        add_Extra_Button('不等号', () => create_inequality_sudoku(6));
        add_Extra_Button('奇数', () => create_odd_sudoku(6));
        add_Extra_Button('奇偶', () => create_odd_even_sudoku(6));
        add_Extra_Button('回文', () => create_palindrome_sudoku(6));
        add_Extra_Button('摩天楼', () => create_skyscraper_sudoku(6));
        add_Extra_Button('X和', () => create_X_sums_sudoku(6));
        add_Extra_Button('三明治', () => create_sandwich_sudoku(6));
        add_Extra_Button('新', () => create_new_sudoku(6));
    } else if (size === 9) {
        add_Extra_Button('候选数', () => create_candidates_sudoku(9));
        add_Extra_Button('对角线', () => create_diagonal_sudoku(9));
        add_Extra_Button('反对角', () => create_anti_diagonal_sudoku(9));
        add_Extra_Button('斜井', () => create_hashtag_sudoku(9));
        add_Extra_Button('斜线', () => create_multi_diagonal_sudoku(9));
        add_Extra_Button('VX', () => create_vx_sudoku(9));
        add_Extra_Button('黑白点', () => create_kropki_sudoku(9));
        add_Extra_Button('连续', () => create_consecutive_sudoku(9));
        add_Extra_Button('缺一门', () => create_missing_sudoku(9));
        add_Extra_Button('窗口', () => create_window_sudoku(9));
        add_Extra_Button('金字塔', () => create_pyramid_sudoku(9));
        add_Extra_Button('同位', () => create_isomorphic_sudoku(9));
        add_Extra_Button('额外区域', () => create_extra_region_sudoku(9));
        add_Extra_Button('灰格连续', () => create_renban_sudoku(9));
        add_Extra_Button('堡垒', () => create_fortress_sudoku(9));
        add_Extra_Button('克隆', () => create_clone_sudoku(9));
        add_Extra_Button('无缘', () => create_anti_king_sudoku(9));
        add_Extra_Button('无马', () => create_anti_knight_sudoku(9));
        add_Extra_Button('无象', () => create_anti_elephant_sudoku(9));
        add_Extra_Button('排除', () => create_exclusion_sudoku(9));
        add_Extra_Button('四格提示', () => create_quadruple_sudoku(9));
        add_Extra_Button('加法', () => create_add_sudoku(9));
        add_Extra_Button('乘积', () => create_product_sudoku(9));
        add_Extra_Button('比例', () => create_ratio_sudoku(9));
        add_Extra_Button('不等号', () => create_inequality_sudoku(9));
        add_Extra_Button('奇数', () => create_odd_sudoku(9));
        add_Extra_Button('奇偶', () => create_odd_even_sudoku(9));
        add_Extra_Button('回文', () => create_palindrome_sudoku(9));
        add_Extra_Button('摩天楼', () => create_skyscraper_sudoku(9));
        add_Extra_Button('X和', () => create_X_sums_sudoku(9));
        add_Extra_Button('三明治', () => create_sandwich_sudoku(9));
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
    panel.style.top = '290px';  // 与数独容器顶部对齐
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
    title.style.fontSize = '18px'; // 确保标题字体大小清晰
    title.style.color = '#333'; // 设置字体颜色为深色
    title.style.textAlign = 'center'; // 居中显示标题
    panel.appendChild(title);

    // 技巧列表
    const techniqueGroups = [
        {
            id: 'elimination',
            name: '排除',
            items: [
                { id: 'Box_Elimination', name: '宫排除', default: true },
                { id: 'Box_One_Cut', name: '一刀流宫排除', default: true },
                { id: 'Row_Col_Elimination', name: '行列排除', default: true },
                { id: 'Variant_Elimination', name: '变型排除', default: false },
                // { id: 'Special_Combination_Region_Elimination', name: '特定组合排除', default: false },
                // { id: 'Multi_Special_Combination_Region_Elimination', name: '多特定组合排除', default: false }
            ]
        },
        {
            id: 'block',
            name: '区块',
        items: [
            { id: 'Box_Block', name: '宫区块', default: true },
            { id: 'Box_Block_One_Cut', name: '一刀流宫区块', default: true },
            { id: 'Box_Pair_Block', name: '宫组合区块', default: true },
            { id: 'Variant_Pair_Block', name: '变型组合区块', default: false },
            { id: 'Row_Col_Block', name: '行列区块', default: true },
            { id: 'Variant_Block', name: '变型区块', default: false },
            // { id: 'Special_Combination_Region_Block', name: '特定组合区块', default: false }, // 新增特定组合区块
            // { id: 'Multi_Special_Combination_Region_Block', name: '多特定组合区块', default: false } // 新增多特定组合区块
        ]
        },
        {
            id: 'special_combination',
            name: '特定组合',
            items: [
                {
                    id: 'special_combination_elimination',
                    name: '特定组合排除',
                    items: [
                        { id: 'Special_Combination_Region_Elimination_1', name: '特定组合排除_1', default: false },
                        { id: 'Special_Combination_Region_Elimination_2', name: '特定组合排除_2', default: false },
                        { id: 'Special_Combination_Region_Elimination_3', name: '特定组合排除_3', default: false },
                        { id: 'Special_Combination_Region_Elimination_4', name: '特定组合排除_4', default: false }
                    ]
                },
                {
                    id: 'multi_special_combination_elimination',
                    name: '多特定组合排除',
                    items: [
                        { id: 'Multi_Special_Combination_Region_Elimination_1', name: '多特定组合排除_1', default: false },
                        { id: 'Multi_Special_Combination_Region_Elimination_2', name: '多特定组合排除_2', default: false },
                        { id: 'Multi_Special_Combination_Region_Elimination_3', name: '多特定组合排除_3', default: false },
                        { id: 'Multi_Special_Combination_Region_Elimination_4', name: '多特定组合排除_4', default: false }
                    ]
                },
                {
                    id: 'special_combination_block',
                    name: '特定组合区块',
                    items: [
                        { id: 'Special_Combination_Region_Block_1', name: '特定组合区块_1', default: false },
                        { id: 'Special_Combination_Region_Block_2', name: '特定组合区块_2', default: false },
                        { id: 'Special_Combination_Region_Block_3', name: '特定组合区块_3', default: false },
                        { id: 'Special_Combination_Region_Block_4', name: '特定组合区块_4', default: false }
                    ]
                },
                {
                    id: 'multi_special_combination_block',
                    name: '多特定组合区块',
                    items: [
                        { id: 'Multi_Special_Combination_Region_Block_1', name: '多特定组合区块_1', default: false },
                        { id: 'Multi_Special_Combination_Region_Block_2', name: '多特定组合区块_2', default: false },
                        { id: 'Multi_Special_Combination_Region_Block_3', name: '多特定组合区块_3', default: false },
                        { id: 'Multi_Special_Combination_Region_Block_4', name: '多特定组合区块_4', default: false }
                    ]
                }
            ]
        },
        {
            id: 'pair',
            name: '数对',
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
            name: '数组',
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
            name: '唯余',
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
            name: '暴力',
            items: [
                { id: 'Brute_Force', name: '暴力求解', default: false }
            ]
        },
        {
            id: 'missing', // 新增欠一排除分组
            name: '欠一排除',
            items: [
                { id: 'Missing_One', name: '欠一排除', default: state.current_mode === 'missing' }
            ]
        }
    ];

    // 初始化技巧状态
    if (!state.techniqueSettings) {
        state.techniqueSettings = {};
        const initializeDefaults = (items) => {
            items.forEach(item => {
                if (item.items) {
                    // 如果是子分组，递归处理
                    initializeDefaults(item.items);
                } else {
                    // 如果是叶子节点，设置默认值
                    state.techniqueSettings[item.id] = item.default;
                }
            });
        };
        techniqueGroups.forEach(group => initializeDefaults(group.items));
    }

    // 渲染技巧面板
    const renderGroupItems = (items, container, updateParentCheckbox) => {
        items.forEach(item => {
            if (item.items) {
                // 子分组
                const subGroupContainer = document.createElement('div');
                subGroupContainer.style.marginBottom = '10px';

                const subGroupTitleContainer = document.createElement('div');
                subGroupTitleContainer.style.display = 'flex';
                subGroupTitleContainer.style.alignItems = 'center';
                subGroupTitleContainer.style.cursor = 'pointer';
                subGroupTitleContainer.style.padding = '5px 0';
                subGroupTitleContainer.style.borderBottom = '1px solid #ccc';

                const subGroupCheckbox = document.createElement('input');
                subGroupCheckbox.type = 'checkbox';
                subGroupCheckbox.style.marginRight = '10px';
                subGroupCheckbox.id = `tech_${item.id}`;

                const updateSubGroupCheckbox = () => {
                        // const allChecked = item.items.every(subItem => state.techniqueSettings[subItem.id]);
                        // subGroupCheckbox.checked = allChecked;
                    const allChecked = item.items.every(subItem => state.techniqueSettings[subItem.id]);
                    subGroupCheckbox.checked = allChecked;
                    // 当子分组状态发生变化时，向上传递给父级以更新父级复选框（支持多层嵌套）
                    if (updateParentCheckbox) updateParentCheckbox();
                };

                updateSubGroupCheckbox();

                subGroupCheckbox.addEventListener('change', (e) => {
                    e.stopPropagation();
                    const isChecked = subGroupCheckbox.checked;
                    item.items.forEach(subItem => {
                        state.techniqueSettings[subItem.id] = isChecked;
                        const checkbox = document.getElementById(`tech_${subItem.id}`);
                        if (checkbox) checkbox.checked = isChecked;
                    });
                    updateSubGroupCheckbox();
                    if (updateParentCheckbox) updateParentCheckbox();
                });

                const subGroupTitle = document.createElement('span');
                subGroupTitle.textContent = item.name;
                subGroupTitle.style.fontWeight = 'bold';

                subGroupTitle.addEventListener('click', () => {
                    const isVisible = subGroupItems.style.display === 'block';
                    subGroupItems.style.display = isVisible ? 'none' : 'block';
                });

                subGroupTitleContainer.appendChild(subGroupCheckbox);
                subGroupTitleContainer.appendChild(subGroupTitle);
                subGroupContainer.appendChild(subGroupTitleContainer);

                const subGroupItems = document.createElement('div');
                subGroupItems.style.display = 'none';
                subGroupItems.style.paddingLeft = '20px';

                renderGroupItems(item.items, subGroupItems, updateSubGroupCheckbox);

                subGroupContainer.appendChild(subGroupItems);
                container.appendChild(subGroupContainer);
            } else {
                // 叶子节点
                const div = document.createElement('div');
                div.style.margin = '5px 0';
                div.style.display = 'flex';
                div.style.alignItems = 'center';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `tech_${item.id}`;
                checkbox.checked = state.techniqueSettings[item.id];
                checkbox.style.marginRight = '10px';

                checkbox.addEventListener('change', () => {
                    state.techniqueSettings[item.id] = checkbox.checked;
                    if (updateParentCheckbox) updateParentCheckbox();
                });

                const label = document.createElement('label');
                label.htmlFor = `tech_${item.id}`;
                label.textContent = item.name;

                div.appendChild(checkbox);
                div.appendChild(label);
                container.appendChild(div);
            }
        });
    };
    techniqueGroups.forEach(group => {
        const groupContainer = document.createElement('div');
        groupContainer.style.marginBottom = '10px';

        const groupTitleContainer = document.createElement('div');
        groupTitleContainer.style.display = 'flex';
        groupTitleContainer.style.alignItems = 'center';
        groupTitleContainer.style.cursor = 'pointer';
        groupTitleContainer.style.padding = '5px 0';
        groupTitleContainer.style.borderBottom = '1px solid #ccc';

        const groupCheckbox = document.createElement('input');
        groupCheckbox.type = 'checkbox';
        groupCheckbox.style.marginRight = '10px';

        const updateGroupCheckbox = () => {
            const allChecked = group.items.every(item => {
                if (item.items) {
                    return item.items.every(subItem => state.techniqueSettings[subItem.id]);
                } else {
                    return state.techniqueSettings[item.id];
                }
            });
            groupCheckbox.checked = allChecked;
        };

        updateGroupCheckbox();

        groupCheckbox.addEventListener('change', (e) => {
            e.stopPropagation();
            const isChecked = groupCheckbox.checked;
            group.items.forEach(item => {
                if (item.items) {
                    item.items.forEach(subItem => {
                        state.techniqueSettings[subItem.id] = isChecked;
                        const checkbox = document.getElementById(`tech_${subItem.id}`);
                        if (checkbox) checkbox.checked = isChecked;
                    });
                } else {
                    state.techniqueSettings[item.id] = isChecked;
                    const checkbox = document.getElementById(`tech_${item.id}`);
                    if (checkbox) checkbox.checked = isChecked;
                }
            });
            // 同步更新子分组（非叶子）复选框的显示状态
            group.items.forEach(item => {
                if (item.items) {
                    const subGroupCheckbox = document.getElementById(`tech_${item.id}`);
                    if (subGroupCheckbox) subGroupCheckbox.checked = isChecked;
                }
            });
        });

        const groupTitle = document.createElement('span');
        groupTitle.textContent = group.name;
        groupTitle.style.fontWeight = 'bold';

        groupTitle.addEventListener('click', () => {
            const isVisible = groupItems.style.display === 'block';
            groupItems.style.display = isVisible ? 'none' : 'block';
        });

        groupTitleContainer.appendChild(groupCheckbox);
        groupTitleContainer.appendChild(groupTitle);
        groupContainer.appendChild(groupTitleContainer);

        const groupItems = document.createElement('div');
        groupItems.style.display = 'none';
        groupItems.style.paddingLeft = '20px';

        renderGroupItems(group.items, groupItems, updateGroupCheckbox);

        groupContainer.appendChild(groupItems);
        panel.appendChild(groupContainer);
    });

    // techniqueGroups.forEach(group => {
    //     const groupContainer = document.createElement('div');
    //     groupContainer.style.marginBottom = '10px';
    
    //     // 大标题容器
    //     const groupTitleContainer = document.createElement('div');
    //     groupTitleContainer.style.display = 'flex';
    //     groupTitleContainer.style.alignItems = 'center';
    //     groupTitleContainer.style.cursor = 'pointer';
    //     groupTitleContainer.style.padding = '5px 0';
    //     groupTitleContainer.style.borderBottom = '1px solid #ccc';
    
    //     // 大标题复选框
    //     const groupCheckbox = document.createElement('input');
    //     groupCheckbox.type = 'checkbox';
    //     groupCheckbox.style.marginRight = '10px';
    
    //     // 动态更新大标题复选框状态
    //     const updateGroupCheckbox = () => {
    //         const allChecked = group.items.every(item => {
    //             if (item.items) {
    //                 // 如果是子分组，检查子分组的所有子项
    //                 return item.items.every(subItem => state.techniqueSettings[subItem.id]);
    //             } else {
    //                 // 如果是叶子节点，直接检查状态
    //                 return state.techniqueSettings[item.id];
    //             }
    //         });
    //         groupCheckbox.checked = allChecked;
    //     };
    
    //     // 初始化大标题复选框状态
    //     updateGroupCheckbox();
    
    //     // 大标题文本
    //     const groupTitle = document.createElement('span');
    //     groupTitle.textContent = group.name;
    //     groupTitle.style.fontWeight = 'bold';
    
    //     // 点击事件：展开/折叠（仅作用于标题文本，不包括复选框）
    //     groupTitle.addEventListener('click', () => {
    //         const isVisible = groupItems.style.display === 'block';
    //         groupItems.style.display = isVisible ? 'none' : 'block';
    //     });
    
    //     groupTitleContainer.appendChild(groupCheckbox);
    //     groupTitleContainer.appendChild(groupTitle);
    //     groupContainer.appendChild(groupTitleContainer);
    
    //     // 小标题容器
    //     const groupItems = document.createElement('div');
    //     groupItems.style.display = 'none'; // 默认折叠
    //     groupItems.style.paddingLeft = '20px';
    
    //     // 递归渲染子分组或叶子节点
    //     const renderGroupItems = (items, container) => {
    //         items.forEach(item => {
    //             if (item.items) {
    //                 // 如果是子分组，递归渲染
    //                 const subGroupContainer = document.createElement('div');
    //                 subGroupContainer.style.marginBottom = '10px';
    
    //                 const subGroupTitleContainer = document.createElement('div');
    //                 subGroupTitleContainer.style.display = 'flex';
    //                 subGroupTitleContainer.style.alignItems = 'center';
    //                 subGroupTitleContainer.style.cursor = 'pointer';
    //                 subGroupTitleContainer.style.padding = '5px 0';
    //                 subGroupTitleContainer.style.borderBottom = '1px solid #ccc';
    
    //                 const subGroupCheckbox = document.createElement('input');
    //                 subGroupCheckbox.type = 'checkbox';
    //                 subGroupCheckbox.style.marginRight = '10px';
    
    //                 // 动态更新子分组复选框状态
    //                 const updateSubGroupCheckbox = () => {
    //                     const allChecked = item.items.every(subItem => state.techniqueSettings[subItem.id]);
    //                     subGroupCheckbox.checked = allChecked;
    //                 };
    
    //                 // 初始化子分组复选框状态
    //                 updateSubGroupCheckbox();
    
    //                 subGroupCheckbox.addEventListener('change', (e) => {
    //                     e.stopPropagation(); // 阻止事件冒泡，避免触发折叠/展开
    //                     const isChecked = subGroupCheckbox.checked;
    //                     item.items.forEach(subItem => {
    //                         state.techniqueSettings[subItem.id] = isChecked;
    //                         const checkbox = document.getElementById(`tech_${subItem.id}`);
    //                         if (checkbox) checkbox.checked = isChecked;
    //                     });
    //                     updateGroupCheckbox(); // 更新大标题复选框状态
    //                 });
    
    //                 const subGroupTitle = document.createElement('span');
    //                 subGroupTitle.textContent = item.name;
    //                 subGroupTitle.style.fontWeight = 'bold';
    
    //                 subGroupTitle.addEventListener('click', () => {
    //                     const isVisible = subGroupItems.style.display === 'block';
    //                     subGroupItems.style.display = isVisible ? 'none' : 'block';
    //                 });
    
    //                 subGroupTitleContainer.appendChild(subGroupCheckbox);
    //                 subGroupTitleContainer.appendChild(subGroupTitle);
    //                 subGroupContainer.appendChild(subGroupTitleContainer);
    
    //                 const subGroupItems = document.createElement('div');
    //                 subGroupItems.style.display = 'none'; // 默认折叠
    //                 subGroupItems.style.paddingLeft = '20px';
    
    //                 renderGroupItems(item.items, subGroupItems);
    
    //                 subGroupContainer.appendChild(subGroupItems);
    //                 container.appendChild(subGroupContainer);
    //             } else {
    //                 // 如果是叶子节点，渲染技巧项
    //                 const div = document.createElement('div');
    //                 div.style.margin = '5px 0';
    //                 div.style.display = 'flex';
    //                 div.style.alignItems = 'center';
    
    //                 const checkbox = document.createElement('input');
    //                 checkbox.type = 'checkbox';
    //                 checkbox.id = `tech_${item.id}`;
    //                 checkbox.checked = state.techniqueSettings[item.id];
    //                 checkbox.style.marginRight = '10px';
    
    //                 checkbox.addEventListener('change', () => {
    //                     state.techniqueSettings[item.id] = checkbox.checked;
    //                     updateGroupCheckbox(); // 更新大标题复选框状态
    //                 });
    
    //                 const label = document.createElement('label');
    //                 label.htmlFor = `tech_${item.id}`;
    //                 label.textContent = item.name;
    
    //                 div.appendChild(checkbox);
    //                 div.appendChild(label);
    //                 container.appendChild(div);
    //             }
    //         });
    //     };
    
    //     renderGroupItems(group.items, groupItems);
    
    //     // 大标题复选框事件：全选/取消全选
    //     groupCheckbox.addEventListener('change', (e) => {
    //         e.stopPropagation(); // 阻止事件冒泡，避免触发折叠/展开
    //         const isChecked = groupCheckbox.checked;
    //         group.items.forEach(item => {
    //             if (item.items) {
    //                 // 如果是子分组，更新子分组的所有子项
    //                 item.items.forEach(subItem => {
    //                     state.techniqueSettings[subItem.id] = isChecked;
    //                     const checkbox = document.getElementById(`tech_${subItem.id}`);
    //                     if (checkbox) checkbox.checked = isChecked;
    //                 });
    //             } else {
    //                 // 如果是叶子节点，直接更新状态
    //                 state.techniqueSettings[item.id] = isChecked;
    //                 const checkbox = document.getElementById(`tech_${item.id}`);
    //                 if (checkbox) checkbox.checked = isChecked;
    //             }
    //         });
    //     });
    
    //     groupContainer.appendChild(groupItems);
    //     panel.appendChild(groupContainer);
    // });

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
    // 记录开始时间
    const start_time = performance.now();
    // 清空之前的日志
    log_process('', true);
    state.candidate_elimination_score = {};
    state.total_score_sum = 0;

    const container = document.querySelector('.sudoku-container');
    const size = state.current_grid_size;


    // 备份当前题目状态
    backup_original_board();
    
        // 获取当前数独状态，包括候选数信息
    let board;
    if (state.current_mode === 'X_sums' || state.current_mode === 'sandwich' || state.current_mode === 'skyscraper') {
        // X和模式，去掉边界
        board = Array.from({ length: size + 2 }, (_, i) =>
            Array.from({ length: size + 2 }, (_, j) => {
                const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
                const val = parseInt(input.value);

                if (state.is_candidates_mode && input.value.length > 1) {
                    return [...new Set(input.value.split('').map(Number))].filter(n => n >= 1 && n <= size);
                }
                return isNaN(val) ? Array.from({length: size}, (_, n) => n + 1) : val;
            })
        );
    } else {
        board = Array.from({ length: size }, (_, i) =>
            Array.from({ length: size }, (_, j) => {
                const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
                const val = parseInt(input.value);

                if (state.is_candidates_mode && input.value.length > 1) {
                    return [...new Set(input.value.split('').map(Number))].filter(n => n >= 1 && n <= size);
                }
                return isNaN(val) ? Array.from({length: size}, (_, n) => n + 1) : val;
            })
        );
    }

    // 判断当前模式，选择不同的有效性检测函数
    let valid_func = isValid;
    const { solution_count, solution } = solve(board, size, valid_func); // 调用主求解函数
    state.solve_stats.solution_count = solution_count;

    // 记录结束时间
    const end_time = performance.now();
    const elapsed = ((end_time - start_time) / 1000).toFixed(3); // 秒，保留三位小数

    // 显示结果
    if (state.solve_stats.solution_count === -1) {
        show_result(`当前技巧无法解出（用时${elapsed}秒）`);
        show_logical_solution();
    } else if (state.solve_stats.solution_count === 0 || state.solve_stats.solution_count === -2) {
        show_result(`当前数独无解！（用时${elapsed}秒）`);
    } else if (state.solve_stats.solution_count === 1) {
        // 退出候选数模式
        state.is_candidates_mode = false;
        document.getElementById('toggleCandidatesMode').textContent = '进入候选数模式';
        
        // 填充唯一解
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    let input;
                    if (state.current_mode === 'X_sums' || state.current_mode === 'sandwich' || state.current_mode === 'skyscraper') {
                        input = container.querySelector(`input[data-row="${i + 1}"][data-col="${j + 1}"]`);
                    } else {
                        input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
                    }
                    if (!input) continue; // 防止input未找到
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
        show_result(`当前数独恰好有唯一解！已自动填充答案。（用时${elapsed}秒）`);
    } else if (state.solve_stats.solution_count > 1) {
        show_result(`当前数独有多个解。（用时${elapsed}秒）`);
    } else {
        show_result(`当前数独有${state.solve_stats.solution_count}个解！（用时${elapsed}秒）`);
    }

    // show_logical_solution();
}