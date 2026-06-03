"use client";

import { ArrowRight, Palette, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { App, Button, Empty, Spin, Tag } from "antd";
import Link from "next/link";

import { navigationTools } from "@/constant/navigation-tools";
import { fetchPrompts, type Prompt } from "@/services/api/prompts";
import { fetchStyleDetails, type StyleDetail } from "@/services/api/styles";

export default function IndexPage() {
    const { message } = App.useApp();
    const [primaryTool] = navigationTools;
    const [hotStyles, setHotStyles] = useState<StyleDetail[]>([]);
    const [hotPrompts, setHotPrompts] = useState<Prompt[]>([]);
    const [loadingShowcase, setLoadingShowcase] = useState(true);
    const [loadingAllStyles, setLoadingAllStyles] = useState(false);
    const [loadingAllPrompts, setLoadingAllPrompts] = useState(false);
    const [allStylesLoaded, setAllStylesLoaded] = useState(false);
    const [allPromptsLoaded, setAllPromptsLoaded] = useState(false);

    useEffect(() => {
        void Promise.all([fetchStyleDetails(0, { isHot: 1, pageSize: 12 }), fetchPrompts({ isHot: 1, pageSize: 12 })])
            .then(([styles, prompts]) => {
                setHotStyles(styles.items);
                setHotPrompts(prompts.items);
            })
            .catch((error) => message.error(error instanceof Error ? error.message : "获取首页推荐失败"))
            .finally(() => setLoadingShowcase(false));
    }, [message]);

    const loadAllHotStyles = async () => {
        if (allStylesLoaded || loadingAllStyles) return;
        setLoadingAllStyles(true);
        try {
            const data = await fetchStyleDetails(0, { isHot: 1, pageSize: 500 });
            setHotStyles(data.items);
            setAllStylesLoaded(true);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "获取全部热门风格失败");
        } finally {
            setLoadingAllStyles(false);
        }
    };

    const loadAllHotPrompts = async () => {
        if (allPromptsLoaded || loadingAllPrompts) return;
        setLoadingAllPrompts(true);
        try {
            const data = await fetchPrompts({ isHot: 1, pageSize: 500 });
            setHotPrompts(data.items);
            setAllPromptsLoaded(true);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "获取全部热门提示词失败");
        } finally {
            setLoadingAllPrompts(false);
        }
    };

    const buildStyleRefLink = (detail: StyleDetail) => {
        const params = new URLSearchParams();
        if (detail.logo) params.set("styleRef", detail.logo);
        if (detail.name) params.set("styleName", detail.name);
        if (detail.fePrompt?.trim()) params.set("prompt", detail.fePrompt.trim());
        return `/image?${params.toString()}`;
    };

    const buildPromptImageLink = (item: Prompt) => {
        const params = new URLSearchParams();
        if (item.coverUrl) params.set("templateRef", item.coverUrl);
        if (item.title) params.set("templateName", item.title);
        if (item.prompt.trim()) params.set("prompt", item.prompt.trim());
        return `/image?${params.toString()}`;
    };

    return (
        <main className="relative h-full overflow-y-auto bg-background bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] text-stone-950 dark:bg-[radial-gradient(rgba(245,245,244,.18)_1px,transparent_1px)] dark:text-stone-100">
            <section className="relative mx-auto max-w-7xl px-6 py-8">
                <section className="grid min-h-[280px] gap-8 border-b border-stone-200 pb-10 dark:border-stone-800 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:items-center">
                    <div>
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-xs text-stone-500 backdrop-blur dark:border-stone-800 dark:bg-stone-950/50 dark:text-stone-400">
                            <Palette className="size-3.5" />
                            风格、提示词与画布工作流
                        </div>
                        <h1 className="ai-title-aurora text-balance text-4xl font-semibold tracking-normal sm:text-5xl lg:text-6xl">无限画布</h1>
                        <p className="mt-5 max-w-xl text-base leading-7 text-stone-500 dark:text-stone-400">生成、连接和重组图片、文字与图形，让创作从单次生成变成连续推演。</p>
                        <div className="mt-7 flex flex-wrap items-center gap-3">
                            <Button type="primary" size="large" href={`/${primaryTool.slug}`} icon={<ArrowRight className="size-4" />} iconPlacement="end">
                                开始使用
                            </Button>
                            <Button size="large" href="/canvas">
                                打开画布
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        {navigationTools.slice(1, 4).map((tool) => {
                            const Icon = tool.icon;
                            return (
                                <Link key={tool.slug} href={`/${tool.slug}`} className="group flex min-h-32 flex-col justify-between rounded-lg border border-stone-200 bg-white/70 p-4 text-stone-900 transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-white dark:border-stone-800 dark:bg-stone-950/50 dark:text-stone-100 dark:hover:border-stone-700">
                                    <Icon className="size-5 text-stone-500 transition group-hover:text-stone-950 dark:text-stone-400 dark:group-hover:text-stone-100" />
                                    <div>
                                        <div className="text-sm font-semibold">{tool.label}</div>
                                        <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">进入创作</div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>

                <section className="py-10">
                    <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold text-stone-950 dark:text-stone-100">热门风格</h2>
                            <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">从风格库中挑选正在推荐的子风格，直接带参考图和提示词进入生图工作台。</p>
                        </div>
                        <Button type="link" href="/styles" className="self-start px-0 md:self-auto" icon={<ArrowRight className="size-4" />} iconPlacement="end">
                            查看更多
                        </Button>
                    </div>

                    {loadingShowcase ? (
                        <div className="flex h-60 items-center justify-center">
                            <Spin />
                        </div>
                    ) : (
                        <div className="thin-scrollbar -mx-6 grid auto-cols-[260px] grid-flow-col grid-rows-3 gap-4 overflow-x-auto px-6 pb-3 sm:auto-cols-[300px]">
                            {hotStyles.map((style) => (
                                <article key={style.id} className="group overflow-hidden rounded-lg border border-stone-200 bg-white/75 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-white dark:border-stone-800 dark:bg-stone-950/55 dark:hover:border-stone-700">
                                    <div className="relative">
                                        {style.logo ? (
                                            <img src={style.logo} alt={style.name} className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                                        ) : (
                                            <div className="flex aspect-[4/3] w-full items-center justify-center bg-stone-100 dark:bg-stone-800">
                                                <span className="text-2xl font-bold text-stone-300 dark:text-stone-600">{style.name.charAt(0)}</span>
                                            </div>
                                        )}
                                        <div className="absolute left-3 top-3 flex items-center gap-2">
                                            <Tag color="red" className="m-0 border-0 text-[11px]">
                                                热门
                                            </Tag>
                                            <Link href={buildStyleRefLink(style)}>
                                                <Button size="small" type="primary" icon={<Sparkles className="size-3.5" />}>
                                                    生成同款
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="line-clamp-1 text-sm font-semibold text-stone-950 dark:text-stone-100">{style.name}</h3>
                                        {style.fePrompt ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-500 dark:text-stone-400">{style.fePrompt}</p> : null}
                                    </div>
                                </article>
                            ))}
                            {hotStyles.length > 0 && !allStylesLoaded ? (
                                <div className="row-span-3 flex min-h-80 items-center justify-center rounded-lg border border-dashed border-stone-300 bg-white/55 p-4 dark:border-stone-700 dark:bg-stone-950/35">
                                    <Button type="primary" icon={<ArrowRight className="size-4" />} iconPlacement="end" loading={loadingAllStyles} onClick={() => void loadAllHotStyles()}>
                                        查看更多热门
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    )}
                    {!loadingShowcase && hotStyles.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无热门风格" className="py-16" /> : null}
                </section>

                <section className="border-t border-stone-200 py-10 dark:border-stone-800">
                    <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold text-stone-950 dark:text-stone-100">热门提示词</h2>
                            <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">直接复用热门提示词和封面模板，快速进入生图工作台生成同款。</p>
                        </div>
                        <Button type="link" href="/prompts" className="self-start px-0 md:self-auto" icon={<ArrowRight className="size-4" />} iconPlacement="end">
                            查看更多
                        </Button>
                    </div>

                    {loadingShowcase ? (
                        <div className="flex h-60 items-center justify-center">
                            <Spin />
                        </div>
                    ) : (
                        <div className="thin-scrollbar -mx-6 grid auto-cols-[260px] grid-flow-col grid-rows-3 gap-4 overflow-x-auto px-6 pb-3 sm:auto-cols-[300px]">
                            {hotPrompts.map((prompt) => (
                                <article key={prompt.id} className="group overflow-hidden rounded-lg border border-stone-200 bg-white/75 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-white dark:border-stone-800 dark:bg-stone-950/55 dark:hover:border-stone-700">
                                    <div className="relative">
                                        {prompt.coverUrl ? (
                                            <img src={prompt.coverUrl} alt={prompt.title} className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                                        ) : (
                                            <div className="flex aspect-[4/3] w-full items-center justify-center bg-stone-100 dark:bg-stone-800">
                                                <span className="text-2xl font-bold text-stone-300 dark:text-stone-600">{prompt.title.charAt(0)}</span>
                                            </div>
                                        )}
                                        <div className="absolute left-3 top-3 flex items-center gap-2">
                                            <Tag color="red" className="m-0 border-0 text-[11px]">
                                                热门
                                            </Tag>
                                            <Link href={buildPromptImageLink(prompt)}>
                                                <Button size="small" type="primary" icon={<Sparkles className="size-3.5" />}>
                                                    生成同款
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="line-clamp-1 text-sm font-semibold text-stone-950 dark:text-stone-100">{prompt.title}</h3>
                                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-500 dark:text-stone-400">{prompt.prompt}</p>
                                        {prompt.tags.length ? (
                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                {prompt.tags.slice(0, 3).map((tag) => (
                                                    <Tag key={tag} className="m-0 text-[11px]">
                                                        {tag}
                                                    </Tag>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                </article>
                            ))}
                            {hotPrompts.length > 0 && !allPromptsLoaded ? (
                                <div className="row-span-3 flex min-h-80 items-center justify-center rounded-lg border border-dashed border-stone-300 bg-white/55 p-4 dark:border-stone-700 dark:bg-stone-950/35">
                                    <Button type="primary" icon={<ArrowRight className="size-4" />} iconPlacement="end" loading={loadingAllPrompts} onClick={() => void loadAllHotPrompts()}>
                                        查看更多热门
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    )}
                    {!loadingShowcase && hotPrompts.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无热门提示词" className="py-16" /> : null}
                </section>
            </section>
        </main>
    );
}
