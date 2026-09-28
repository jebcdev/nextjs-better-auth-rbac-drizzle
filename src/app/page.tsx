import type { Metadata } from "next";
import { generateAsyncDescription, generateAsyncTitle, MetadataGeneratorProps } from "@/lib/seo/metadataGenerator";

const pageData:MetadataGeneratorProps = {
    title: "Inicio",
    description: "Inicio de el Sistema",
};

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: await generateAsyncTitle(pageData.title),
        description: await generateAsyncDescription(pageData.description),
    };
}

export default function Page() {
    return (
        <>
            <main>
                <h1></h1>
            </main>
        </>
    );
}
