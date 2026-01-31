import React, { useState, useEffect } from 'react';

export const HookBugComponent = ({ shouldFetch }: { shouldFetch: boolean }) => {
       // Hook自体は常に呼ぶ！
    useEffect(() => {
        // 条件判定はHookの「中」で行うのがReactのルール
        if (shouldFetch) {
            console.log("Fetching data...");
        }
    }, [shouldFetch]); // 依存配列に shouldFetch を入れるのもお忘れなく！

    const [count, setCount] = useState(0);

    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
    );
};
