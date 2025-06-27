// state.js（使用对象包装以允许修改）
export const state = {
    is_skyscraper_mode: false,
    is_vx_mode: false,
    current_grid_size: 0,
    is_candidates_mode: false,
    originalBoard: null, // 备份原始题目状态
    isShowingSolution: false // 是否正在显示答案
};
