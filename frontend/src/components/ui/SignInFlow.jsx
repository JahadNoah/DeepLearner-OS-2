import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

function cn(...classes) {
    return classes.filter(Boolean).join(" ");
}

// ─── Canvas Reveal Effect ────────────────────────────────────────────────────

const CanvasRevealEffect = ({
    animationSpeed = 10,
    opacities = [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1],
    colors = [[0, 255, 255]],
    containerClassName,
    dotSize,
    showGradient = true,
    reverse = false,
}) => {
    return (
        <div className={cn("h-full relative w-full", containerClassName)}>
            <div className="h-full w-full">
                <DotMatrix
                    colors={colors ?? [[0, 255, 255]]}
                    dotSize={dotSize ?? 3}
                    opacities={opacities ?? [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1]}
                    shader={`
                        ${reverse ? "u_reverse_active" : "false"}_;
                        animation_speed_factor_${animationSpeed.toFixed(1)}_;
                    `}
                    center={["x", "y"]}
                />
            </div>
            {showGradient && (
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
            )}
        </div>
    );
};

// ─── Dot Matrix ────────────────────────────────────────────────────────────

const DotMatrix = ({
    colors = [[0, 0, 0]],
    opacities = [0.04, 0.04, 0.04, 0.04, 0.04, 0.08, 0.08, 0.08, 0.08, 0.14],
    totalSize = 20,
    dotSize = 2,
    shader = "",
    center = ["x", "y"],
}) => {
    const uniforms = useMemo(() => {
        let colorsArray = [colors[0], colors[0], colors[0], colors[0], colors[0], colors[0]];
        if (colors.length === 2) {
            colorsArray = [colors[0], colors[0], colors[0], colors[1], colors[1], colors[1]];
        } else if (colors.length === 3) {
            colorsArray = [colors[0], colors[0], colors[1], colors[1], colors[2], colors[2]];
        }
        return {
            u_colors: {
                value: colorsArray.map((color) => [color[0] / 255, color[1] / 255, color[2] / 255]),
                type: "uniform3fv",
            },
            u_opacities: { value: opacities, type: "uniform1fv" },
            u_total_size: { value: totalSize, type: "uniform1f" },
            u_dot_size: { value: dotSize, type: "uniform1f" },
            u_reverse: {
                value: shader.includes("u_reverse_active") ? 1 : 0,
                type: "uniform1i",
            },
        };
    }, [colors, opacities, totalSize, dotSize, shader]);

    return (
        <ShaderCanvas
            source={`
                precision mediump float;
                in vec2 fragCoord;
                uniform float u_time;
                uniform float u_opacities[10];
                uniform vec3 u_colors[6];
                uniform float u_total_size;
                uniform float u_dot_size;
                uniform vec2 u_resolution;
                uniform int u_reverse;
                out vec4 fragColor;

                float PHI = 1.61803398874989484820459;
                float random(vec2 xy) {
                    return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);
                }
                float map(float value, float min1, float max1, float min2, float max2) {
                    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
                }

                void main() {
                    vec2 st = fragCoord.xy;
                    ${center.includes("x") ? "st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));" : ""}
                    ${center.includes("y") ? "st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));" : ""}

                    float opacity = step(0.0, st.x);
                    opacity *= step(0.0, st.y);

                    vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));

                    float frequency = 5.0;
                    float show_offset = random(st2);
                    float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency));
                    opacity *= u_opacities[int(rand * 10.0)];
                    opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
                    opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));

                    vec3 color = u_colors[int(show_offset * 6.0)];

                    float animation_speed_factor = 0.5;
                    vec2 center_grid = u_resolution / 2.0 / u_total_size;
                    float dist_from_center = distance(center_grid, st2);

                    float timing_offset_intro = dist_from_center * 0.01 + (random(st2) * 0.15);
                    float max_grid_dist = distance(center_grid, vec2(0.0, 0.0));
                    float timing_offset_outro = (max_grid_dist - dist_from_center) * 0.02 + (random(st2 + 42.0) * 0.2);

                    if (u_reverse == 1) {
                        opacity *= 1.0 - step(timing_offset_outro, u_time * animation_speed_factor);
                        opacity *= clamp((step(timing_offset_outro + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);
                    } else {
                        opacity *= step(timing_offset_intro, u_time * animation_speed_factor);
                        opacity *= clamp((1.0 - step(timing_offset_intro + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);
                    }

                    fragColor = vec4(color, opacity);
                    fragColor.rgb *= fragColor.a;
                }
            `}
            uniforms={uniforms}
            maxFps={60}
        />
    );
};

// ─── Shader Material (R3F) ───────────────────────────────────────────────────

const ShaderMesh = ({ source, uniforms }) => {
    const { size } = useThree();
    const ref = useRef(null);

    useFrame(({ clock }) => {
        if (!ref.current) return;
        ref.current.material.uniforms.u_time.value = clock.getElapsedTime();
    });

    const getUniforms = () => {
        const prepared = {};
        for (const name in uniforms) {
            const u = uniforms[name];
            switch (u.type) {
                case "uniform1f":
                case "uniform1i":
                    prepared[name] = { value: u.value };
                    break;
                case "uniform3f":
                    prepared[name] = { value: new THREE.Vector3().fromArray(u.value) };
                    break;
                case "uniform1fv":
                    prepared[name] = { value: u.value };
                    break;
                case "uniform3fv":
                    prepared[name] = {
                        value: u.value.map((v) => new THREE.Vector3().fromArray(v)),
                    };
                    break;
                case "uniform2f":
                    prepared[name] = { value: new THREE.Vector2().fromArray(u.value) };
                    break;
                default:
                    console.error(`Unknown uniform type for '${name}'`);
            }
        }
        prepared["u_time"] = { value: 0 };
        prepared["u_resolution"] = {
            value: new THREE.Vector2(size.width * 2, size.height * 2),
        };
        return prepared;
    };

    const material = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: `
                    precision mediump float;
                    in vec2 coordinates;
                    uniform vec2 u_resolution;
                    out vec2 fragCoord;
                    void main() {
                        float x = position.x;
                        float y = position.y;
                        gl_Position = vec4(x, y, 0.0, 1.0);
                        fragCoord = (position.xy + vec2(1.0)) * 0.5 * u_resolution;
                        fragCoord.y = u_resolution.y - fragCoord.y;
                    }
                `,
                fragmentShader: source,
                uniforms: getUniforms(),
                glslVersion: THREE.GLSL3,
                blending: THREE.CustomBlending,
                blendSrc: THREE.SrcAlphaFactor,
                blendDst: THREE.OneFactor,
            }),
        [size.width, size.height, source]
    );

    return (
        <mesh ref={ref}>
            <planeGeometry args={[2, 2]} />
            <primitive object={material} attach="material" />
        </mesh>
    );
};

const ShaderCanvas = ({ source, uniforms, maxFps = 60 }) => (
    <Canvas className="absolute inset-0 h-full w-full">
        <ShaderMesh source={source} uniforms={uniforms} maxFps={maxFps} />
    </Canvas>
);

// ─── Sign In Flow (exported) ─────────────────────────────────────────────────

export function SignInFlow({ onLogin }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [step, setStep] = useState("email"); // "email" | "password" | "success"
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [initialCanvasVisible, setInitialCanvasVisible] = useState(true);
    const [reverseCanvasVisible, setReverseCanvasVisible] = useState(false);

    const handleEmailSubmit = (e) => {
        e.preventDefault();
        if (email) setStep("password");
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await onLogin(email, password);
            // Trigger canvas reverse animation on success
            setReverseCanvasVisible(true);
            setTimeout(() => setInitialCanvasVisible(false), 50);
            setTimeout(() => setStep("success"), 2000);
        } catch {
            setError("E-mel atau kata laluan tidak sah. Sila cuba lagi.");
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setStep("email");
        setPassword("");
        setError("");
        setReverseCanvasVisible(false);
        setInitialCanvasVisible(true);
    };

    return (
        <div className="flex w-full flex-col min-h-screen bg-black relative overflow-hidden">
            {/* ── Background canvas ── */}
            <div className="absolute inset-0 z-0">
                {initialCanvasVisible && (
                    <div className="absolute inset-0">
                        <CanvasRevealEffect
                            animationSpeed={3}
                            containerClassName="bg-black"
                            colors={[[255, 255, 255], [255, 255, 255]]}
                            dotSize={6}
                            reverse={false}
                        />
                    </div>
                )}
                {reverseCanvasVisible && (
                    <div className="absolute inset-0">
                        <CanvasRevealEffect
                            animationSpeed={4}
                            containerClassName="bg-black"
                            colors={[[255, 255, 255], [255, 255, 255]]}
                            dotSize={6}
                            reverse={true}
                        />
                    </div>
                )}
                {/* Radial vignette keeps centre dark so form is readable */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.85)_0%,_transparent_70%)]" />
                <div className="absolute top-0 inset-x-0 h-1/4 bg-gradient-to-b from-black to-transparent" />
                <div className="absolute bottom-0 inset-x-0 h-1/4 bg-gradient-to-t from-black to-transparent" />
            </div>

            {/* ── Content ── */}
            <div className="relative z-10 flex flex-col flex-1">
                {/* Mini nav */}
                <nav
                    className="fixed top-6 left-1/2 -translate-x-1/2 z-20
                               flex items-center gap-4 px-5 py-2.5
                               rounded-full border border-white/10
                               bg-black/50 backdrop-blur-md"
                >
                    <Link to="/" className="flex items-center gap-2 text-white font-semibold text-sm tracking-wide">
                        <img src="/DeepLearnerLogo1.png" alt="DeepLearner" className="w-[20px] h-[20px] object-contain" />
                        DeepLearner
                    </Link>
                    <div className="h-3.5 w-px bg-white/20" />
                    <Link to="/register" className="text-white/50 hover:text-white text-xs transition-colors">
                        Daftar percuma
                    </Link>
                </nav>

                {/* Form area */}
                <div className="flex flex-1 flex-col justify-center items-center px-4">
                    <div className="w-full max-w-sm mt-24">
                        <AnimatePresence mode="wait">

                            {/* ── Step 1: Email ── */}
                            {step === "email" && (
                                <motion.div
                                    key="email"
                                    initial={{ opacity: 0, x: -60 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -60 }}
                                    transition={{ duration: 0.35, ease: "easeOut" }}
                                    className="space-y-6 text-center"
                                >
                                    <div className="space-y-1">
                                        <h1 className="text-[2.4rem] font-bold leading-tight tracking-tight text-white">
                                            Selamat kembali 👋
                                        </h1>
                                        <p className="text-lg text-white/40 font-light">
                                            Log masuk ke DeepLearner
                                        </p>
                                    </div>

                                    <form onSubmit={handleEmailSubmit} className="space-y-3">
                                        <div className="relative">
                                            <input
                                                type="email"
                                                placeholder="pelajar@ukm.edu.my"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full bg-white/5 backdrop-blur-sm text-white
                                                           border border-white/10 rounded-full py-3.5 px-5
                                                           focus:outline-none focus:border-white/30
                                                           text-center placeholder:text-white/25 text-sm"
                                                required
                                                autoComplete="email"
                                                autoFocus
                                            />
                                            <button
                                                type="submit"
                                                className="absolute right-1.5 top-1/2 -translate-y-1/2
                                                           text-white w-9 h-9 flex items-center justify-center
                                                           rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                            >
                                                →
                                            </button>
                                        </div>
                                    </form>

                                    <p className="text-xs text-white/30 pt-4">
                                        Belum ada akaun?{" "}
                                        <Link
                                            to="/register"
                                            className="text-white/55 underline hover:text-white transition-colors"
                                        >
                                            Daftar percuma
                                        </Link>
                                    </p>
                                </motion.div>
                            )}

                            {/* ── Step 2: Password ── */}
                            {step === "password" && (
                                <motion.div
                                    key="password"
                                    initial={{ opacity: 0, x: 60 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 60 }}
                                    transition={{ duration: 0.35, ease: "easeOut" }}
                                    className="space-y-6 text-center"
                                >
                                    <div className="space-y-1">
                                        <h1 className="text-[2rem] font-bold leading-tight tracking-tight text-white">
                                            Masukkan kata laluan
                                        </h1>
                                        <p className="text-white/35 text-sm truncate">{email}</p>
                                    </div>

                                    {error && (
                                        <div className="text-red-300 text-sm bg-red-400/10 border border-red-400/20 rounded-2xl px-4 py-2.5">
                                            {error}
                                        </div>
                                    )}

                                    <form onSubmit={handleLogin} className="space-y-3">
                                        <div className="relative">
                                            <input
                                                type={showPw ? "text" : "password"}
                                                placeholder="Kata laluan"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full bg-white/5 backdrop-blur-sm text-white
                                                           border border-white/10 rounded-full py-3.5 px-5
                                                           focus:outline-none focus:border-white/30
                                                           text-center placeholder:text-white/25 text-sm"
                                                required
                                                autoFocus
                                                autoComplete="current-password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPw((v) => !v)}
                                                className="absolute right-1.5 top-1/2 -translate-y-1/2
                                                           text-white w-9 h-9 flex items-center justify-center
                                                           rounded-full bg-white/10 hover:bg-white/20 transition-colors text-sm"
                                                tabIndex={-1}
                                            >
                                                {showPw ? "🙈" : "👁"}
                                            </button>
                                        </div>

                                        <div className="flex gap-3">
                                            <motion.button
                                                type="button"
                                                onClick={handleBack}
                                                className="rounded-full bg-white/8 text-white/70 font-medium
                                                           px-6 py-3 hover:bg-white/15 transition-colors flex-none"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.97 }}
                                            >
                                                Balik
                                            </motion.button>
                                            <motion.button
                                                type="submit"
                                                disabled={loading || !password}
                                                className={`flex-1 rounded-full font-medium py-3 border transition-all duration-300 ${
                                                    password && !loading
                                                        ? "bg-white text-black border-transparent hover:bg-white/90 cursor-pointer"
                                                        : "bg-white/5 text-white/30 border-white/10 cursor-not-allowed"
                                                }`}
                                                whileHover={password && !loading ? { scale: 1.02 } : {}}
                                                whileTap={password && !loading ? { scale: 0.97 } : {}}
                                            >
                                                {loading ? (
                                                    <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                                ) : (
                                                    "Log Masuk"
                                                )}
                                            </motion.button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}

                            {/* ── Step 3: Success ── */}
                            {step === "success" && (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, y: 40 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.3 }}
                                    className="space-y-6 text-center"
                                >
                                    <div className="space-y-1">
                                        <h1 className="text-[2.4rem] font-bold leading-tight tracking-tight text-white">
                                            Berjaya masuk!
                                        </h1>
                                        <p className="text-lg text-white/40 font-light">
                                            Selamat datang semula
                                        </p>
                                    </div>
                                    <motion.div
                                        initial={{ scale: 0.6, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ duration: 0.5, delay: 0.5 }}
                                        className="py-8 flex justify-center"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-8 w-8 text-black"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
