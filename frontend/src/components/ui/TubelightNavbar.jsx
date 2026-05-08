import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";

export function TubelightNavbar({ items, className }) {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(items[0]?.name || "");
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Update active tab based on current route
    useEffect(() => {
        const currentItem = items.find((item) => {
            if (item.end) {
                return location.pathname === item.url;
            }
            return location.pathname.startsWith(item.url);
        });
        if (currentItem) {
            setActiveTab(currentItem.name);
        }
    }, [location.pathname, items]);

    return (
        <div
            className={cn(
                // Pinned to the top center
                "fixed top-6 left-1/2 -translate-x-1/2 z-50",
                className,
            )}
        >
            {/* Dark theme glassmorphism styling */}
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 backdrop-blur-xl py-1 px-1 rounded-full shadow-2xl">
                {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.name;

                    return (
                        <NavLink
                            key={item.name}
                            to={item.url}
                            end={item.end}
                            onClick={() => setActiveTab(item.name)}
                            className={cn(
                                "relative cursor-pointer text-sm font-medium px-6 py-2 rounded-full transition-colors",
                                "text-white/60 hover:text-white",
                                isActive && "text-white",
                            )}
                        >
                            <span className="hidden md:inline">{item.name}</span>
                            <span className="md:hidden">
                                <Icon size={18} strokeWidth={2.5} />
                            </span>
                            {isActive && (
                                <motion.div
                                    layoutId="lamp"
                                    className="absolute inset-0 w-full bg-white/10 rounded-full -z-10"
                                    initial={false}
                                    transition={{
                                        type: "spring",
                                        stiffness: 300,
                                        damping: 30,
                                    }}
                                >
                                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-emerald-400 rounded-t-full">
                                        <div className="absolute w-12 h-6 bg-emerald-400/20 rounded-full blur-md -top-2 -left-2" />
                                        <div className="absolute w-8 h-6 bg-emerald-400/20 rounded-full blur-md -top-1" />
                                        <div className="absolute w-4 h-4 bg-emerald-400/20 rounded-full blur-sm top-0 left-2" />
                                    </div>
                                </motion.div>
                            )}
                        </NavLink>
                    );
                })}
            </div>
        </div>
    );
}
