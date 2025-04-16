import { useEffect, useState, useRef, useCallback, JSX } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Progress from "@/components/Progress";
import ImageInput from "@/components/ImageInput";
import BboxOverlay from "@/components/BboxOverlay";
import React from "react";

interface ProgressItem {
  file: string;
  progress: number;
  total: number;
}

interface Detection {
  labels: string[];
  bboxes?: number[][];
  quad_boxes?: number[][];
}

interface ResultData {
  [key: string]: string | Detection | Record<string, unknown>;
}

interface WorkerMessage {
  status: string;
  data?: string | Record<string, unknown>;
  file?: string;
  progress?: number;
  total?: number;
  result?: ResultData;
  time?: number;
}

interface NavigatorGPU extends Navigator {
  gpu?: unknown;
}

const IS_WEBGPU_AVAILABLE =
  typeof navigator !== "undefined" && !!(navigator as NavigatorGPU).gpu;

function HomePage(): JSX.Element {
  const worker = useRef<Worker | null>(null);

  const [status, setStatus] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);

  const [task, setTask] = useState<string>("<CAPTION>");
  const [text, setText] = useState<string>("");
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);
  const [time, setTime] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    worker.current ??= new Worker(new URL("./worker.js", import.meta.url), {
      type: "module",
    });

    const onMessageReceived = (e: MessageEvent<WorkerMessage>) => {
      switch (e.data.status) {
        case "loading":
          setStatus("loading");
          if (typeof e.data.data === "string") {
            setLoadingMessage(e.data.data);
          }
          break;

        case "initiate":
          setProgressItems((prev) => [...prev, e.data as ProgressItem]);
          break;

        case "progress":
          setProgressItems((prev) =>
            prev.map((item) => {
              if (item.file === e.data.file) {
                return { ...item, ...e.data };
              }
              return item;
            }),
          );
          break;

        case "done":
          setProgressItems((prev) =>
            prev.filter((item) => item.file !== e.data.file),
          );
          break;

        case "ready":
          setStatus("ready");
          break;

        case "complete":
          setResult(e.data.result || null);
          setTime(e.data.time || null);
          setStatus("ready");
          break;
      }
    };

    worker.current.addEventListener("message", onMessageReceived);

    return () => {
      worker.current?.removeEventListener("message", onMessageReceived);
    };
  }, []);

  const handleClick = useCallback(() => {
    if (status === null) {
      setStatus("loading");
      worker.current?.postMessage({ type: "load" });
    } else {
      setStatus("running");
      worker.current?.postMessage({
        type: "run",
        data: { text, url: image, task },
      });
    }
  }, [status, task, image, text]);

  const toggleTheme = (): void => {
    setDarkMode(!darkMode);
  };

  const [scrollPosition, setScrollPosition] = useState<number>(0);
  const [, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDarkMode(darkModeQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    darkModeQuery.addEventListener("change", handleChange);

    return () => darkModeQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return IS_WEBGPU_AVAILABLE ? (
    <div
      className={`min-h-screen w-full transition-colors duration-500 ${
        darkMode
          ? "bg-zinc-950 text-zinc-200"
          : "bg-gradient-to-br from-zinc-50 via-white to-blue-50 text-zinc-800"
      }`}
    >
      <div className="pointer-events-none fixed inset-0 h-screen w-full overflow-hidden">
        <div
          className={`fixed top-0 left-0 h-full w-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')] ${
            darkMode ? "opacity-40" : "opacity-15"
          }`}
          style={{ transform: `translateY(${scrollPosition * 0.1}px)` }}
        />

        {darkMode ? (
          <>
            <div
              className="fixed -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl"
              style={{
                transform: `translate(${scrollPosition * 0.05}px, ${
                  scrollPosition * 0.03
                }px)`,
              }}
            />
            <div
              className="fixed top-1/3 -right-40 h-96 w-96 rounded-full bg-purple-600/10 blur-3xl"
              style={{
                transform: `translate(${-scrollPosition * 0.04}px, ${
                  scrollPosition * 0.07
                }px)`,
              }}
            />
            <div
              className="fixed bottom-20 left-1/4 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl"
              style={{
                transform: `translate(${scrollPosition * 0.06}px, ${
                  -scrollPosition * 0.04
                }px)`,
              }}
            />
          </>
        ) : (
          <>
            <div
              className="fixed -top-40 -left-40 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl"
              style={{
                transform: `translate(${scrollPosition * 0.05}px, ${
                  scrollPosition * 0.03
                }px)`,
              }}
            />
            <div
              className="fixed top-1/3 -right-40 h-96 w-96 rounded-full bg-indigo-400/15 blur-3xl"
              style={{
                transform: `translate(${-scrollPosition * 0.04}px, ${
                  scrollPosition * 0.07
                }px)`,
              }}
            />
            <div
              className="fixed bottom-20 left-1/4 h-96 w-96 rounded-full bg-purple-300/15 blur-3xl"
              style={{
                transform: `translate(${scrollPosition * 0.06}px, ${
                  -scrollPosition * 0.04
                }px)`,
              }}
            />
            <div
              className="fixed top-1/2 left-1/3 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl"
              style={{
                transform: `translate(${-scrollPosition * 0.03}px, ${
                  scrollPosition * 0.05
                }px)`,
              }}
            />
          </>
        )}
      </div>

      <div className="relative container mx-auto max-w-7xl px-4 py-12">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className={`absolute top-6 right-6 z-10 rounded-full p-3 ${
            darkMode
              ? "border border-zinc-700/50 bg-zinc-800/80 text-indigo-300 shadow-lg shadow-black/10 backdrop-blur-md"
              : "border border-indigo-100 bg-white/90 text-indigo-600 shadow-lg shadow-indigo-100/30 backdrop-blur-md transition-shadow hover:shadow-indigo-200/40"
          }`}
        >
          {darkMode ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
        </motion.button>

        {/* Loading Overlay */}
        <AnimatePresence>
          {status === "loading" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl"
            >
              <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                className={`w-[550px] rounded-3xl p-10 ${
                  darkMode
                    ? "border border-zinc-800 bg-zinc-900/80 text-white"
                    : "border border-indigo-100 bg-white/95 text-gray-800"
                } shadow-2xl backdrop-blur-lg`}
              >
                {/* loading animation */}
                <div className="mb-8 flex items-center justify-center">
                  <div className="relative h-20 w-20">
                    <motion.div
                      animate={{
                        rotate: 360,
                        background: darkMode
                          ? ["#3730a3", "#6366f1", "#8b5cf6", "#3730a3"]
                          : ["#4338ca", "#4f46e5", "#6366f1", "#4338ca"],
                      }}
                      transition={{
                        rotate: {
                          duration: 10,
                          repeat: Infinity,
                          ease: "linear",
                        },
                        background: { duration: 4, repeat: Infinity },
                      }}
                      className="absolute h-20 w-20 rounded-full opacity-30 blur-xl"
                    />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className={`h-20 w-20 rounded-full border-t-2 border-b-2 ${
                        darkMode ? "border-indigo-400" : "border-indigo-600"
                      }`}
                    />
                    <motion.div
                      animate={{ rotate: -180 }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className={`absolute inset-2 rounded-full border-r-2 border-l-2 ${
                        darkMode ? "border-indigo-300" : "border-indigo-500"
                      }`}
                    />
                    <motion.div
                      animate={{
                        scale: [0.8, 1.1, 0.8],
                        background: darkMode
                          ? ["#4338ca", "#6366f1", "#4338ca"]
                          : ["#4f46e5", "#6366f1", "#4f46e5"],
                      }}
                      transition={{
                        scale: {
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        },
                        background: { duration: 3, repeat: Infinity },
                      }}
                      className="absolute inset-5 rounded-full opacity-60 blur-sm"
                    />
                  </div>
                </div>

                <motion.div
                  className={`text-sm font-medium tracking-wide uppercase ${
                    darkMode ? "text-indigo-300/90" : "text-indigo-600/90"
                  } mt-4`}
                >
                  <span className="inline-flex items-center gap-2">
                    {loadingMessage || "Loading"}
                    <span className="inline-block w-5 overflow-hidden">
                      <motion.span
                        animate={{ x: [-20, 0] }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.5,
                          ease: "easeInOut",
                        }}
                        className="inline-block"
                      >
                        ···
                      </motion.span>
                    </span>
                  </span>

                  {progressItems.map(({ file, progress, total }, i) => (
                    <Progress
                      key={i}
                      text={file}
                      percentage={progress}
                      total={total}
                    />
                  ))}
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex flex-col items-center justify-center pt-10">
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, type: "spring" }}
            className="mb-14 text-center"
          >
            <div className="mb-6 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: 0.2,
                }}
                className={`mr-3 flex h-16 w-16 items-center justify-center rounded-2xl`}
                style={{
                  background: darkMode
                    ? "linear-gradient(135deg, rgb(79, 70, 229) 0%, rgb(124, 58, 237) 100%)"
                    : "linear-gradient(135deg, rgb(55, 48, 163) 0%, rgb(109, 40, 217) 100%)",
                  boxShadow: darkMode
                    ? "0 10px 20px -5px rgba(79, 70, 229, 0.3)"
                    : "0 15px 30px -5px rgba(79, 70, 229, 0.4)",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                  />
                </svg>
              </motion.div>
              <h1 className="relative text-6xl font-bold">
                <span
                  className={`bg-clip-text text-transparent ${
                    darkMode
                      ? "bg-gradient-to-r from-indigo-400 via-purple-400 to-violet-400"
                      : "bg-gradient-to-r from-indigo-700 via-purple-700 to-violet-700"
                  }`}
                >
                  Vision AI
                </span>
                <motion.span
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="ml-3 inline-flex items-center rounded-full px-3 py-1 text-xl"
                  style={{
                    background: darkMode
                      ? "linear-gradient(90deg, rgb(79, 70, 229) 0%, rgb(124, 58, 237) 100%)"
                      : "linear-gradient(90deg, rgb(55, 48, 163) 0%, rgb(109, 40, 217) 100%)",
                    boxShadow: darkMode
                      ? "0 5px 15px -3px rgba(79, 70, 229, 0.3)"
                      : "0 8px 20px -4px rgba(79, 70, 229, 0.4)",
                  }}
                >
                  <span className="mr-1.5 h-2 w-2 animate-pulse rounded-full bg-white"></span>
                  <span className="font-medium text-white">WebGPU</span>
                </motion.span>
              </h1>
            </div>
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className={`text-xl font-medium ${
                darkMode ? "text-zinc-400" : "text-indigo-700/80"
              }`}
            >
              Fast, private, and powerful computer vision - right inside your
              device.
            </motion.h2>
          </motion.div>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className={`w-full max-w-6xl rounded-3xl p-8 backdrop-blur-lg ${
              darkMode
                ? "border border-zinc-800/70 bg-zinc-900/10 shadow-xl shadow-black/10"
                : "bg-white-500/10 border border-indigo-100/80 shadow-2xl shadow-blue-200/30"
            }`}
          >
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
              <div className="space-y-8">
                <div className="space-y-3">
                  <label
                    className={`block text-sm font-medium ${
                      darkMode ? "text-indigo-300" : "text-indigo-700"
                    }`}
                  >
                    Vision Task
                  </label>
                  <div
                    className={`relative overflow-hidden rounded-2xl ${
                      darkMode
                        ? "border border-zinc-700 bg-zinc-800/70 backdrop-blur-md"
                        : "bg-white shadow-md ring-1 ring-indigo-100"
                    } transition-all duration-300`}
                  >
                    <select
                      className={`w-full appearance-none rounded-2xl px-5 py-4 pr-10 ${
                        darkMode
                          ? "bg-transparent text-white focus:ring-2 focus:ring-indigo-500/50"
                          : "bg-transparent text-indigo-900 focus:ring-2 focus:ring-indigo-400/50"
                      } border-none focus:outline-none`}
                      value={task}
                      onChange={(e) => setTask(e.target.value)}
                    >
                      <option
                        className={
                          darkMode
                            ? "bg-zinc-800 text-white"
                            : "bg-white text-indigo-900"
                        }
                        value="<CAPTION>"
                      >
                        Caption
                      </option>
                      <option
                        className={
                          darkMode
                            ? "bg-zinc-800 text-white"
                            : "bg-white text-indigo-900"
                        }
                        value="<DETAILED_CAPTION>"
                      >
                        Detailed Caption
                      </option>
                      <option
                        className={
                          darkMode
                            ? "bg-zinc-800 text-white"
                            : "bg-white text-indigo-900"
                        }
                        value="<MORE_DETAILED_CAPTION>"
                      >
                        More Detailed Caption
                      </option>
                      <option
                        className={
                          darkMode
                            ? "bg-zinc-800 text-white"
                            : "bg-white text-indigo-900"
                        }
                        value="<OCR>"
                      >
                        OCR
                      </option>
                      <option
                        className={
                          darkMode
                            ? "bg-zinc-800 text-white"
                            : "bg-white text-indigo-900"
                        }
                        value="<OCR_WITH_REGION>"
                      >
                        OCR with Region
                      </option>
                      <option
                        className={
                          darkMode
                            ? "bg-zinc-800 text-white"
                            : "bg-white text-indigo-900"
                        }
                        value="<OD>"
                      >
                        Object Detection
                      </option>
                      <option
                        className={
                          darkMode
                            ? "bg-zinc-800 text-white"
                            : "bg-white text-indigo-900"
                        }
                        value="<DENSE_REGION_CAPTION>"
                      >
                        Dense Region Caption
                      </option>
                      <option
                        className={
                          darkMode
                            ? "bg-zinc-800 text-white"
                            : "bg-white text-indigo-900"
                        }
                        value="<CAPTION_TO_PHRASE_GROUNDING>"
                      >
                        Caption to Phrase Grounding
                      </option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4">
                      <svg
                        className={`h-5 w-5 ${
                          darkMode ? "text-indigo-300" : "text-indigo-600"
                        }`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
                {/* Image Input */}
                <div className="space-y-3">
                  <label
                    className={`block text-sm font-medium ${
                      darkMode ? "text-indigo-300" : "text-indigo-700"
                    }`}
                  >
                    Input Image
                  </label>
                  <ImageInput
                    className={`flex h-80 cursor-pointer flex-col items-center justify-center rounded-2xl ${
                      darkMode
                        ? "border-2 border-dashed border-zinc-700 bg-zinc-800/30 backdrop-blur-sm hover:border-indigo-500/70 hover:bg-zinc-800/50"
                        : "border-2 border-dashed border-indigo-200 bg-white/70 backdrop-blur-sm hover:border-indigo-400 hover:bg-white/80"
                    } group relative overflow-hidden transition-all duration-300`}
                    onImageChange={(file: File | null, result: string) => {
                      worker.current?.postMessage({ type: "reset" });
                      setResult(null);
                      setImage(result);
                    }}
                  >
                    {!darkMode && (
                      <div className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-indigo-200/20 via-purple-200/20 to-blue-200/20"></div>
                      </div>
                    )}
                  </ImageInput>
                </div>
              </div>

              <div className="flex flex-col space-y-8">
                {/* Text Input (for Phrase Grounding) */}
                <AnimatePresence>
                  {task === "<CAPTION_TO_PHRASE_GROUNDING>" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-3 overflow-hidden"
                    >
                      <label
                        className={`block text-sm font-medium ${
                          darkMode ? "text-indigo-300" : "text-indigo-700"
                        }`}
                      >
                        Text Input
                      </label>
                      <input
                        className={`w-full rounded-2xl border px-5 py-4 ${
                          darkMode
                            ? "border-zinc-700 bg-zinc-800/70 text-white backdrop-blur-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
                            : "border-indigo-100 bg-white/80 text-indigo-900 shadow-inner backdrop-blur-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-400/50 focus:outline-none"
                        }`}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Enter text to ground in the image..."
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Output */}
                <div className="flex-grow space-y-3">
                  <label
                    className={`block text-sm font-medium ${
                      darkMode ? "text-indigo-300" : "text-indigo-700"
                    }`}
                  >
                    Output
                  </label>
                  <div
                    className={`relative flex h-80 items-center justify-center rounded-2xl border ${
                      darkMode
                        ? "border-zinc-700 bg-zinc-800/30 backdrop-blur-sm"
                        : "border-indigo-100 bg-white/80 shadow-inner backdrop-blur-sm"
                    } overflow-hidden`}
                  >
                    {result?.[task] ? (
                      // Check for both detection formats
                      typeof result[task] === "object" &&
                      result[task] !== null &&
                      "labels" in result[task] &&
                      (result[task].bboxes || result[task].quad_boxes) ? (
                        <>
                          <BboxOverlay
                            imageUrl={image as string}
                            detections={result[task]}
                          />
                          {time && (
                            <div
                              className={`absolute right-3 bottom-3 rounded-full px-4 py-1.5 text-xs ${
                                darkMode
                                  ? "border border-indigo-800/30 bg-indigo-900/40 text-indigo-300 backdrop-blur-md"
                                  : "border border-indigo-200 bg-indigo-100/80 text-indigo-700 shadow-sm backdrop-blur-md"
                              }`}
                            >
                              <div className="flex items-center">
                                <svg
                                  className="mr-1.5 h-3 w-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                {(time / 1000).toFixed(2)} sec
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="h-full w-full overflow-auto p-5"
                        >
                          {typeof result[task] === "string" ? (
                            <p
                              className={`text-center ${
                                darkMode ? "text-zinc-200" : "text-indigo-900"
                              }`}
                            >
                              {result[task]}
                            </p>
                          ) : (
                            <pre
                              className={`text-sm whitespace-pre-wrap ${
                                darkMode ? "text-zinc-300" : "text-indigo-800"
                              }`}
                            >
                              {JSON.stringify(result[task], null, 2)}
                            </pre>
                          )}
                          {time && (
                            <div
                              className={`absolute right-3 bottom-3 rounded-full px-4 py-1.5 text-xs ${
                                darkMode
                                  ? "border border-indigo-800/30 bg-indigo-900/40 text-indigo-300 backdrop-blur-md"
                                  : "border border-indigo-200 bg-indigo-100/80 text-indigo-700 shadow-sm backdrop-blur-md"
                              }`}
                            >
                              <div className="flex items-center">
                                <svg
                                  className="mr-1.5 h-3 w-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                {(time / 1000).toFixed(2)} sec
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )
                    ) : (
                      <div className="text-center">
                        <motion.div
                          animate={{
                            opacity: [0.5, 0.8, 0.5],
                            scale: [0.98, 1.02, 0.98],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            repeatType: "loop",
                          }}
                          className={`mx-auto mb-6 h-16 w-16 rounded-full ${
                            darkMode
                              ? "border border-indigo-800/30 bg-indigo-900/20 backdrop-blur-sm"
                              : "border border-indigo-200 bg-indigo-100/80 shadow-lg backdrop-blur-sm"
                          } flex items-center justify-center`}
                        >
                          <svg
                            className={`h-8 w-8 ${
                              darkMode ? "text-indigo-400" : "text-indigo-600"
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </motion.div>
                        <p
                          className={`${
                            darkMode ? "text-zinc-400" : "text-indigo-600"
                          } italic`}
                        >
                          Results will appear here
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleClick}
                    disabled={
                      status === "running" ||
                      (status !== null && image === null)
                    }
                    className={`group relative cursor-pointer overflow-hidden rounded-full px-6 py-2.5 text-sm font-semibold backdrop-blur-md transition-all duration-300 ${
                      status === "running" ||
                      (status !== null && image === null)
                        ? "cursor-not-allowed opacity-70"
                        : darkMode
                          ? "border border-indigo-800/40 bg-indigo-950/30 text-indigo-300 hover:bg-indigo-900/40 hover:text-indigo-200"
                          : "border border-indigo-200/70 bg-indigo-50/80 text-indigo-600 shadow-md hover:bg-indigo-100 hover:text-indigo-700"
                    }`}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-r opacity-40 group-hover:opacity-60 ${
                        darkMode
                          ? "from-indigo-500/10 to-purple-500/10 opacity-30 group-hover:opacity-50"
                          : "from-indigo-300/20 to-purple-300/20"
                      }`}
                    />

                    <div
                      className={`absolute -inset-1 bg-gradient-to-r opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-40 ${
                        darkMode
                          ? "from-indigo-500/20 via-purple-500/10 to-indigo-500/20 group-hover:opacity-30"
                          : "from-indigo-300/20 via-purple-300/10 to-indigo-300/20"
                      }`}
                    />

                    <span className="relative z-10">
                      {status === null
                        ? "Load Model"
                        : status === "running"
                          ? "Processing..."
                          : "Run Model"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className={`mt-8 text-center text-sm ${
              darkMode ? "text-zinc-500" : "text-indigo-600/70"
            }`}
          >
            <p className="flex items-center justify-center gap-1.5">
              <span className="inline-flex items-center">
                <span className="mr-1">⚡</span>Accelerated by WebGPU
              </span>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  ) : (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <svg
          className="mx-auto mb-6 h-24 w-24 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h2 className="mb-4 text-4xl font-bold text-white">
          WebGPU Not Supported
        </h2>
        <p className="max-w-md text-xl text-gray-300">
          Your browser doesn&apos;t support WebGPU technology. Please try a
          modern browser like Chrome or Edge.
        </p>
      </motion.div>
    </div>
  );
}

export default HomePage;
