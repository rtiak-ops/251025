import React from 'react';

interface UserProfileProps {
    name: string;
    age: number;
}

const UserProfile: React.FC<UserProfileProps> = ({ name, age }) => {
    return (
        <div>
            <h1>{name}</h1>
            <p>Age: {age}</p>
        </div>
    );
};

export const BuggyComponent = () => {
    // 【わざとバグを仕込みます】
    // 1. ageは数字(number)のはずなのに、文字列("25")を渡している
    // 2. nameは必須(string)のはずなのに、渡していない
    return (
        <UserProfile name="Taro" age={25} />
    );
};
