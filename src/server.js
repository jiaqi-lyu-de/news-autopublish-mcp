import 'dotenv/config';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { login } from "./toutiao/login.js";
import { checkLoginStatus } from "./toutiao/status.js";
import { logout } from "./toutiao/logout.js";
import { getBreakingNews } from "./services/news.js";
import { publishArticle } from "./toutiao/publish.js";


/**
 * Create a simple MCP server.
 */
const server = new Server(
    {
        name: "toutiao-mcp-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

/**
 * Register tools.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "toutiao_login",
                description: "登录今日头条：获取二维码并等待扫码登录，登录成功后保存 Cookie",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "toutiao_check_status",
                description: "检查今日头条登录状态",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "toutiao_logout",
                description: "退出登录：删除本地存储的 Cookie 文件",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "get_breaking_news",
                description: "获取全球突发新闻（Breaking News）",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "toutiao_publish_article",
                description: "发布今日头条文章：设置标题、图片和正文并发布",
                inputSchema: {
                    type: "object",
                    properties: {
                        title: { type: "string", description: "文章标题（2-30个字）" },
                        content: { type: "string", description: "文章正文" },
                        imagePath: { type: "string", description: "本地封面图片路径" },
                    },
                    required: ["title", "content", "imagePath"],
                },
            },

        ],
    };
});

/**
 * Handle tool call requests.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "toutiao_login") {
        const result = await login();
        console.error('Login tool execution finished, returning result...');
        const content = [
            {
                type: "text",
                text: result.message || JSON.stringify(result, null, 2),
            },
        ];

        // If a QR code is present, also return it as an image block.
        if (result.qrCode && result.qrCode.startsWith('data:image')) {
            const [metadata, base64Data] = result.qrCode.split(',');
            const mimeType = metadata.split(':')[1].split(';')[0];
            content.push({
                type: "image",
                data: base64Data,
                mimeType: mimeType,
            });
        }

        return { content };
    }

    if (request.params.name === "toutiao_check_status") {
        const result = await checkLoginStatus();
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }

    if (request.params.name === "toutiao_logout") {
        const result = await logout();
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }

    if (request.params.name === "get_breaking_news") {
        const result = await getBreakingNews();
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }

    if (request.params.name === "toutiao_publish_article") {
        const { title, content, imagePath } = request.params.arguments ?? {};
        const result = await publishArticle(title, content, imagePath);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }


    throw new Error("Tool not found");
});

/**
 * Start the server.
 */
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Toutiao MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
