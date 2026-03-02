import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function runClient() {
    // 创建传输层，指向我们刚刚写的 server.js
    // 注意：需要使用 node 运行 server.js
    const transport = new StdioClientTransport({
        command: "node",
        args: ["src/server.js"],
    });

    const client = new Client(
        {
            name: "example-client",
            version: "1.0.0",
        },
        {
            capabilities: {},
        }
    );

    await client.connect(transport);

    // 1. 列出可用的工具
    const tools = await client.listTools();
    console.log("可用工具:", JSON.stringify(tools, null, 2));

    // 2. 检查登录状态
    console.log("\n--- 检查登录状态 ---");
    const statusResult = await client.callTool({
        name: "toutiao_check_status",
        arguments: {},
    });
    console.log("状态检查结果:", JSON.stringify(statusResult, null, 2));

    // 3. 测试登录 (警告：这会启动浏览器并等待扫码)
    console.log("\n--- 开始登录流程 ---");
    const loginResult = await client.callTool({
        name: "toutiao_login",
        arguments: {},
    });
    console.log("登录结果:", JSON.stringify(loginResult, null, 2));

    await client.close();
}

runClient().catch(console.error);
