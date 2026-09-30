import { forwardRef, useImperativeHandle, useCallback, useRef } from "react";
import type { AnimatedIconHandle, AnimatedIconProps } from "./types";
import { motion, useAnimate } from "framer-motion";

const UploadIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  (
    { size = 24, color = "currentColor", strokeWidth = 2, className = "" },
    ref,
  ) => {
    const [scope, animate] = useAnimate();
    const isAnimatingRef = useRef(false);

    const start = useCallback(async () => {
      if (isAnimatingRef.current) return;
      isAnimatingRef.current = true;

      while (isAnimatingRef.current) {
        // 1. Fly Up and Fade Out
        await animate(
          ".arrow-group",
          { y: -12, opacity: 0 },
          { duration: 0.4, ease: "easeIn" },
        );

        if (!isAnimatingRef.current) break;

        // 2. Instant Reset to Bottom
        await animate(".arrow-group", { y: 12, opacity: 0 }, { duration: 0 });

        // 3. Fly In from Bottom to Center
        await animate(
          ".arrow-group",
          { y: 0, opacity: 1 },
          { duration: 0.4, ease: "easeOut" },
        );

        if (!isAnimatingRef.current) break;

        // Small pause at center for "intention"
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }, [animate]);

    const stop = useCallback(() => {
      isAnimatingRef.current = false;
      animate(
        ".arrow-group",
        { y: 0, opacity: 1 },
        { duration: 0.3, ease: "easeOut" },
      );
    }, [animate]);

    useImperativeHandle(ref, () => ({
      startAnimation: start,
      stopAnimation: stop,
    }));

    return (
      <motion.svg
        ref={scope}
        onHoverStart={start}
        onHoverEnd={stop}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`cursor-pointer ${className}`}
        style={{ overflow: "visible" }}
      >
        {/* Cloud Base */}
        <path d="M4 16.2422C2.79401 15.435 2 14.0602 2 12.5C2 10.1564 3.79151 8.23129 6.07974 8.01937C6.54781 5.17213 9.02024 3 12 3C14.9798 3 17.4522 5.17213 17.9203 8.01937C20.2085 8.23129 22 10.1564 22 12.5C22 14.0602 21.206 15.435 20 16.2422" />

        {/* Arrow */}
        <motion.g className="arrow-group">
          <path d="M8 16L12 12M12 12L16 16M12 12V21" />
        </motion.g>
      </motion.svg>
    );
  },
);

UploadIcon.displayName = "UploadIcon";
export default UploadIcon;
