import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface FlipCountdownProps {
    targetDate: string;
}

const FlipUnit = ({ value, label }: { value: number; label?: string }) => {
    const [currentValue, setCurrentValue] = useState(value);
    const [previousValue, setPreviousValue] = useState(value);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (value !== currentValue) {
            setPreviousValue(currentValue);
            setCurrentValue(value);
            setIsAnimating(true);
            const timer = setTimeout(() => setIsAnimating(false), 900);
            return () => clearTimeout(timer);
        }
    }, [value, currentValue]);

    const pad = (n: number) => n.toString().padStart(2, "0");

    return (
        <div className="flex flex-col items-center">
            <div className="relative perspective-1000 w-9 sm:w-11 h-11 sm:h-14">
                {/* Background Top (Next Value) */}
                <div className="absolute inset-0 flex flex-col">
                    <div className="h-1/2 bg-[#1e1e1e] rounded-t border-b border-black/10 flex items-end justify-center overflow-hidden">
                        <span className="text-lg sm:text-2xl font-bold font-mono text-white leading-none translate-y-1/2">
                            {pad(currentValue)}
                        </span>
                    </div>
                    <div className="h-1/2 bg-[#1e1e1e] rounded-b flex items-start justify-center overflow-hidden">
                        <span className="text-lg sm:text-2xl font-bold font-mono text-white leading-none -translate-y-1/2">
                            {pad(previousValue)}
                        </span>
                    </div>
                </div>

                {/* Static Bottom (New Value) */}
                <div className="absolute inset-0 flex flex-col pointer-events-none">
                    <div className="h-1/2" />
                    <div className="h-1/2 bg-[#1e1e1e] rounded-b flex items-start justify-center overflow-hidden border-t border-white/[0.03]">
                        <span className="text-lg sm:text-2xl font-bold font-mono text-white leading-none -translate-y-1/2">
                            {pad(currentValue)}
                        </span>
                    </div>
                </div>

                {/* Animating Leaf */}
                {isAnimating && (
                    <div className="absolute inset-0 flex flex-col z-20">
                        {/* Top half flipping down */}
                        <div className="h-1/2 bg-[#1e1e1e] rounded-t border-b border-black/10 flex items-end justify-center overflow-hidden animate-flip-down">
                            <span className="text-lg sm:text-2xl font-bold font-mono text-white leading-none translate-y-1/2">
                                {pad(previousValue)}
                            </span>
                        </div>
                        {/* Bottom half flipping up */}
                        <div className="h-1/2 bg-[#1e1e1e] rounded-b flex items-start justify-center overflow-hidden animate-flip-up">
                            <span className="text-lg sm:text-2xl font-bold font-mono text-white leading-none -translate-y-1/2">
                                {pad(currentValue)}
                            </span>
                        </div>
                    </div>
                )}
            </div>
            {label && (
                <span className="text-[8px] uppercase tracking-tighter opacity-50 mt-0.5 font-bold">
                    {label}
                </span>
            )}
        </div>
    );
};

export const FlipCountdown = ({ targetDate }: FlipCountdownProps) => {
    const [timeLeft, setTimeLeft] = useState<{
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
    } | null>(null);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = +new Date(targetDate) - +new Date();

            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                });
            } else {
                setTimeLeft(null);
            }
        };

        const timer = setInterval(calculateTimeLeft, 1000);
        calculateTimeLeft();

        return () => clearInterval(timer);
    }, [targetDate]);

    if (!timeLeft) return null;

    return (
        <div className="flex items-center gap-1.5 sm:gap-2">
            <FlipUnit value={timeLeft.days} label="d" />
            <span className="text-white/30 font-bold mb-3">:</span>
            <FlipUnit value={timeLeft.hours} label="h" />
            <span className="text-white/30 font-bold mb-3">:</span>
            <FlipUnit value={timeLeft.minutes} label="m" />
            <span className="text-white/30 font-bold mb-3">:</span>
            <FlipUnit value={timeLeft.seconds} label="s" />
        </div>
    );
};
