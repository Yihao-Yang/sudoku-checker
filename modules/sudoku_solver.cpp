#include <emscripten/bind.h>
#include <vector>
#include <algorithm>
#include <cmath>
#include <unordered_set>

using namespace emscripten;

class SudokuSolver {
public:
    // 检查候选数数独的唯一解数量
    int countSolutions(const std::vector<std::vector<int>>& board, int size) {
        this->size = size;
        this->boxSize = (size == 6) ? std::vector<int>{2, 3} : std::vector<int>{ (int)sqrt(size), (int)sqrt(size) };
        
        solutionCount = 0;
        solution.clear();
        
        // 转换为内部数据结构（0=空格，正数=确定值，负数=候选数掩码）
        internalBoard.resize(size, std::vector<int>(size, 0));
        for (int i = 0; i < size; i++) {
            for (int j = 0; j < size; j++) {
                if (board[i][j] > 0) {
                    internalBoard[i][j] = board[i][j]; // 确定值
                } else if (board[i][j] < 0) {
                    internalBoard[i][j] = board[i][j]; // 候选数掩码（例如 -123 表示候选数1,2,3）
                }
            }
        }
        
        solve(0, 0);
        return solutionCount;
    }

    // 获取唯一解（如果有）
    std::vector<std::vector<int>> getSolution() {
        return solution;
    }

private:
    int size;
    std::vector<int> boxSize;
    int solutionCount;
    std::vector<std::vector<int>> internalBoard;
    std::vector<std::vector<int>> solution;

    // 检查数字 num 是否可放在 (row, col)
    bool isValid(int row, int col, int num) {
        // 检查单元格是否有确定值或候选数约束
        int cellValue = internalBoard[row][col];
        if (cellValue > 0) return cellValue == num; // 必须匹配确定值
        if (cellValue < 0) {
            // 检查候选数是否包含 num
            int mask = -cellValue;
            bool hasCandidate = false;
            while (mask > 0) {
                if (mask % 10 == num) {
                    hasCandidate = true;
                    break;
                }
                mask /= 10;
            }
            if (!hasCandidate) return false;
        }
        
        // 检查行、列、宫格
        for (int i = 0; i < size; i++) {
            // 检查行
            if (internalBoard[row][i] == num) return false;
            // 检查列
            if (internalBoard[i][col] == num) return false;
        }
        
        // 检查宫格
        int startRow = row - row % boxSize[0];
        int startCol = col - col % boxSize[1];
        for (int r = startRow; r < startRow + boxSize[0]; r++) {
            for (int c = startCol; c < startCol + boxSize[1]; c++) {
                if (internalBoard[r][c] == num) return false;
            }
        }
        
        return true;
    }

    // 回溯求解
    void solve(int row, int col) {
        if (solutionCount >= 2) return; // 提前终止
        
        if (row == size) {
            solutionCount++;
            if (solutionCount == 1) {
                // 保存第一个解
                solution = internalBoard;
            }
            return;
        }
        
        int nextRow = (col == size - 1) ? row + 1 : row;
        int nextCol = (col + 1) % size;
        
        int cellValue = internalBoard[row][col];
        
        // 如果单元格有确定值，直接跳过
        if (cellValue > 0) {
            solve(nextRow, nextCol);
            return;
        }
        
        // 如果是候选数单元格，尝试所有可能的候选数
        if (cellValue < 0) {
            int mask = -cellValue;
            while (mask > 0) {
                int num = mask % 10;
                mask /= 10;
                if (isValid(row, col, num)) {
                    internalBoard[row][col] = num;
                    solve(nextRow, nextCol);
                    internalBoard[row][col] = cellValue; // 回溯
                }
            }
            return;
        }
        
        // 普通空格，尝试所有可能数字
        for (int num = 1; num <= size; num++) {
            if (isValid(row, col, num)) {
                internalBoard[row][col] = num;
                solve(nextRow, nextCol);
                internalBoard[row][col] = 0; // 回溯
            }
        }
    }
};

// 绑定到 JavaScript
EMSCRIPTEN_BINDINGS(sudoku) {
    class_<SudokuSolver>("SudokuSolver")
        .constructor<>()
        .function("countSolutions", &SudokuSolver::countSolutions)
        .function("getSolution", &SudokuSolver::getSolution);
}