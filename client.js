import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function runClient() {
    // Create a transport layer pointing to the server.js we just wrote.
    // Note: server.js must be run with Node.js.
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

    // 1. List available tools
    const tools = await client.listTools();
    console.log("可用工具:", JSON.stringify(tools, null, 2));

    // 2. Check login status
    console.log("\n--- 检查登录状态 ---");
    const statusResult = await client.callTool({
        name: "toutiao_check_status",
        arguments: {},
    });
    console.log("状态检查结果:", JSON.stringify(statusResult, null, 2));

    // 3. Test login (warning: this launches a browser and waits for a QR scan)
    // timeout 5 minutes
    console.log("\n--- 开始登录流程 ---");
    const loginResult = await client.callTool({
        name: "toutiao_login",
        arguments: {},
        timeout: 5 * 60 * 1000,
    });
    console.log("登录结果:", JSON.stringify(loginResult, null, 2));

    await client.close();
}

runClient().catch(console.error);
