"use client";

import { List, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { App, Button, Card, Empty, Input, Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { fetchStyles } from "@/services/api/styles";

export default function StylesPage() {
    const { message } = App.useApp();
    const [keyword, setKeyword] = useState("");

    const stylesQuery = useQuery({
        queryKey: ["styles", keyword],
        queryFn: () => fetchStyles({ keyword, pageSize: 200 }),
    });

    useEffect(() => {
        if (stylesQuery.isError) {
            message.error(stylesQuery.error instanceof Error ? stylesQuery.error.message : "获取风格分类失败");
        }
    }, [message, stylesQuery.isError, stylesQuery.error]);

    const styles = stylesQuery.data?.items || [];

    return (
        <div className="flex h-full flex-col overflow-hidden bg-background text-stone-800 dark:text-stone-100">
            <main className="min-h-0 flex-1 overflow-y-auto bg-background bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] px-6 py-8 [background-size:16px_16px] dark:bg-[radial-gradient(rgba(245,245,244,.16)_1px,transparent_1px)]">
                <div className="pb-8">
                    <div className="mx-auto max-w-5xl text-center">
                        <h1 className="text-4xl font-semibold tracking-tight text-stone-950 dark:text-stone-100">风格库</h1>
                        <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">共 {stylesQuery.data?.total || 0} 个风格分类，挑选稳定风格模板快速生成同款图片。</p>
                    </div>
                    {stylesQuery.isLoading ? (
                        <div className="flex h-60 items-center justify-center">
                            <Spin />
                        </div>
                    ) : null}
                </div>
                {!stylesQuery.isLoading ? (
                    <div className="mx-auto max-w-7xl">
                        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                            {styles.map((style) => (
                                <Card
                                    key={style.id}
                                    hoverable
                                    className="overflow-hidden"
                                    styles={{ body: { padding: 0 } }}
                                    cover={
                                        style.coverUrl ? (
                                            <img src={style.coverUrl} alt={style.name} className="aspect-[4/3] w-full object-cover" />
                                        ) : (
                                            <div className="flex aspect-[4/3] w-full items-center justify-center bg-stone-100 dark:bg-stone-800">
                                                <span className="text-3xl font-bold text-stone-300 dark:text-stone-600">{style.name.charAt(0)}</span>
                                            </div>
                                        )
                                    }
                                >
                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="line-clamp-1 text-sm font-semibold text-stone-950 dark:text-stone-100">{style.name}</h3>
                                            <span className="shrink-0 text-xs text-stone-400 dark:text-stone-500">{style.activeStylesCount} 个</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 pb-4">
                                        <Link href={`/styles/${style.id}`}>
                                            <Button size="small" icon={<List className="size-3.5" />}>
                                                挑选子模版
                                            </Button>
                                        </Link>
                                    </div>
                                </Card>
                            ))}
                        </div>
                        {styles.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无风格分类" className="py-16" /> : null}
                    </div>
                ) : null}
            </main>
        </div>
    );
}
