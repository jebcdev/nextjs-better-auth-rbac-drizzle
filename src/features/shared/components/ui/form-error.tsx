"use client";

type Props = {
    message?: string;
};

export const SingleFormError = ({ message }: Props) => {
    if (!message) return null;

    return (
        <span className="text-sm text-red-500 mt-1 block animate-pulse">
            | {message} *
        </span>
    );
};