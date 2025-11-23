# 数独

标准数独。

支持笔记草稿

支持实时简单检查（重复、缺失）

支持时间树自动存档，跳转不同可能，尝试后可以回退

web 版在线玩 [shuduku](https://shuduku.netlify.app/)

支持的策略

-   singleCandidate 单个候选数
-   uniqueCandidate 行、列、区块唯一候选数
-   hiddenPair 隐藏对
-   hiddenTriple 隐藏三连
-   hiddenQuad 隐藏四连
-   pointing 宫指向
-   claiming 反 pointing，宫消除
-   x-wing
-   xy-wing wxy-wing vwxy-wing
-   回溯暴力计算
