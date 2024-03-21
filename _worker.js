// <!--GAMFC-->version base on commit 43fad05dcdae3b723c53c226f8181fc5bd47223e, time is 2023-06-22 15:20:05 UTC<!--GAMFC-END-->.
// @ts-ignore
import { connect } from "cloudflare:sockets";

let userID = "90cd4a77-141a-43c9-991b-08263cfe9c10";

//let sub = '';// 留空则显示原版内容
let sub = "vless-4ca.pages.dev"; // 内置优选订阅生成器，可自行搭建 https://github.com/cmliu/WorkerVless2sub
let subconverter = "api.v1.mk"; // clash订阅转换后端，目前使用肥羊的订阅转换功能。自带虚假uuid和host订阅。
let subconfig =
    "https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/config/ACL4SSR_Online_Full_MultiMode.ini"; //订阅配置文件
if (!isValidUUID(userID)) {
    throw new Error("uuid is not valid");
}

// 虚假uuid和hostname，用于发送给配置生成服务
let fakeUserID = generateUUID();
let fakeHostName = generateRandomString();

export default {
    /**
     * @param {import("@cloudflare/workers-types").Request} request
     * @param {{UUID: string, PROXYIP: string}} env
     * @param {import("@cloudflare/workers-types").ExecutionContext} ctx
     * @returns {Promise<Response>}
     */
    async fetch(request, env, ctx) {
        try {
            const userAgent = request.headers.get("User-Agent").toLowerCase();
            userID = env.UUID || userID;
            sub = env.SUB || sub;
            subconverter = env.SUBAPI || subconverter;
            subconfig = env.SUBCONFIG || subconfig;

            const upgradeHeader = request.headers.get("Upgrade");
            const url = new URL(request.url);
            // const url = new URL(request.url);
            switch (url.pathname) {
                case "/":
                    return new Response(JSON.stringify(request.cf), { status: 200 });
                case `/${userID}`: {
                    const vlessConfig = await getVLESSConfig(
                        userID,
                        request.headers.get("Host"),
                        sub,
                        userAgent,
                        'true'
                    );
                    const now = Date.now();
                    const timestamp = Math.floor(now / 1000);
                    const today = new Date(now);
                    today.setHours(0, 0, 0, 0);
                    if (userAgent && userAgent.includes("mozilla")) {
                        return new Response(`${vlessConfig}`, {
                            status: 200,
                            headers: {
                                "Content-Type": "text/plain;charset=utf-8",
                            },
                        });
                    } else {
                        return new Response(`${vlessConfig}`, {
                            status: 200,
                            headers: {
                                "Content-Disposition":
                                    "attachment; filename=edgetunnel; filename*=utf-8''edgetunnel",
                                "Content-Type": "text/plain;charset=utf-8",
                                "Profile-Update-Interval": "6",
                                "Subscription-Userinfo": `upload=0; download=${Math.floor(
                                    ((now - today.getTime()) / 86400000) * 24 * 1099511627776
                                )}; total=${24 * 1099511627776}; expire=${timestamp}`,
                            },
                        });
                    }
                }
                default:
                    return new Response("Not found", { status: 404 });
            }
        } catch (err) {
      /** @type {Error} */ let e = err;
            return new Response(e.toString());
        }
    },
};

// https://xtls.github.io/development/protocols/vless.html
// https://github.com/zizifn/excalidraw-backup/blob/main/v2ray-protocol.excalidraw

/**
 *
 * @param {string} base64Str
 * @returns
 */
function base64ToArrayBuffer(base64Str) {
    if (!base64Str) {
        return { error: null };
    }
    try {
        // go use modified Base64 for URL rfc4648 which js atob not support
        base64Str = base64Str.replace(/-/g, "+").replace(/_/g, "/");
        const decode = atob(base64Str);
        const arryBuffer = Uint8Array.from(decode, (c) => c.charCodeAt(0));
        return { earlyData: arryBuffer.buffer, error: null };
    } catch (error) {
        return { error };
    }
}

/**
 * This is not real UUID validation
 * @param {string} uuid
 */
function isValidUUID(uuid) {
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

const byteToHex = [];
for (let i = 0; i < 256; ++i) {
    byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
    return (
        byteToHex[arr[offset + 0]] +
        byteToHex[arr[offset + 1]] +
        byteToHex[arr[offset + 2]] +
        byteToHex[arr[offset + 3]] +
        "-" +
        byteToHex[arr[offset + 4]] +
        byteToHex[arr[offset + 5]] +
        "-" +
        byteToHex[arr[offset + 6]] +
        byteToHex[arr[offset + 7]] +
        "-" +
        byteToHex[arr[offset + 8]] +
        byteToHex[arr[offset + 9]] +
        "-" +
        byteToHex[arr[offset + 10]] +
        byteToHex[arr[offset + 11]] +
        byteToHex[arr[offset + 12]] +
        byteToHex[arr[offset + 13]] +
        byteToHex[arr[offset + 14]] +
        byteToHex[arr[offset + 15]]
    ).toLowerCase();
}
function stringify(arr, offset = 0) {
    const uuid = unsafeStringify(arr, offset);
    if (!isValidUUID(uuid)) {
        throw TypeError("Stringified UUID is invalid");
    }
    return uuid;
}

function revertFakeInfo(content, userID, hostName, isBase64) {
    if (isBase64) content = atob(content); //Base64解码
    content = content
        .replace(new RegExp(fakeUserID, "g"), userID)
        .replace(new RegExp(fakeHostName, "g"), hostName)
        .replace(new RegExp("/proxyIP=[^,]*,", "g"), hostName);
    if (isBase64) content = btoa(content); //Base64编码

    return content;
}

function generateRandomNumber() {
    let minNum = 100000;
    let maxNum = 999999;
    return Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
}

function generateRandomString() {
    let minLength = 2;
    let maxLength = 3;
    let length =
        Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    let characters = "abcdefghijklmnopqrstuvwxyz";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters[Math.floor(Math.random() * characters.length)];
    }
    return result;
}

function generateUUID() {
    let uuid = "";
    for (let i = 0; i < 32; i++) {
        let num = Math.floor(Math.random() * 16);
        if (num < 10) {
            uuid += num;
        } else {
            uuid += String.fromCharCode(num + 55);
        }
    }
    return uuid
        .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5")
        .toLowerCase();
}

/**
 * @param {string} userID
 * @param {string | null} hostName
 * @param {string} sub
 * @param {string} userAgent
 * @returns {Promise<string>}
 */
async function getVLESSConfig(userID, hostName, sub, userAgent, RproxyIP) {
    // 如果sub为空，则显示原始内容
    if (!sub || sub === "") {
        const vlessMain = `vless://${userID}@${hostName}:443?encryption=none&security=tls&sni=${hostName}&fp=randomized&type=ws&host=${hostName}&path=%2F%3Fed%3D2048#${hostName}`;

        return `
    ################################################################
    v2ray
    ---------------------------------------------------------------
    ${vlessMain}
    ---------------------------------------------------------------
    ################################################################
    clash-meta
    ---------------------------------------------------------------
    - type: vless
      name: ${hostName}
      server: ${hostName}
      port: 443
      uuid: ${userID}
      network: ws
      tls: true
      udp: false
      sni: ${hostName}
      client-fingerprint: chrome
      ws-opts:
        path: "/?ed=2048"
        headers:
          host: ${hostName}
    ---------------------------------------------------------------
    ################################################################
    `;
    } else if (
        sub &&
        userAgent.includes("mozilla") &&
        !userAgent.includes("linux x86")
    ) {
        const vlessMain = `vless://${userID}@${hostName}:443?encryption=none&security=tls&sni=${hostName}&fp=randomized&type=ws&host=${hostName}&path=%2F%3Fed%3D2048#${hostName}`;

        return `
    ################################################################
    Subscribe / sub 订阅地址, 支持 Base64、clash-meta、sing-box 订阅格式, 您的订阅内容由 ${sub} 提供维护支持.
    ---------------------------------------------------------------
    https://${hostName}/${userID}
    ---------------------------------------------------------------
    ################################################################
    v2ray
    ---------------------------------------------------------------
    ${vlessMain}
    ---------------------------------------------------------------
    ################################################################
    clash-meta
    ---------------------------------------------------------------
    - type: vless
      name: ${hostName}
      server: ${hostName}
      port: 443
      uuid: ${userID}
      network: ws
      tls: true
      udp: false
      sni: ${hostName}
      client-fingerprint: chrome
      ws-opts:
        path: "/?ed=2048"
        headers:
          host: ${hostName}
    ---------------------------------------------------------------
    `;
    } else {
        if (typeof fetch != "function") {
            return "Error: fetch is not available in this environment.";
        }
        // 如果是使用默认域名，则改成一个workers的域名，订阅器会加上代理
        if (hostName.includes(".workers.dev")) {
            fakeHostName = `${fakeHostName}.${generateRandomString()}${generateRandomNumber()}.workers.dev`;
        } else if (hostName.includes(".pages.dev")) {
            fakeHostName = `${fakeHostName}.${generateRandomString()}${generateRandomNumber()}.pages.dev`;
        } else if (hostName.includes("worker")) {
            fakeHostName = `worker.${fakeHostName}${generateRandomNumber()}.net`;
        } else {
            fakeHostName = `${fakeHostName}.${generateRandomNumber()}.xyz`;
        }
        let content = "";
        let url = "";
        let isBase64 = false;
        if (userAgent.includes('clash')) {
            url = `https://${subconverter}/sub?target=clash&url=https%3A%2F%2F${sub}%2Fsub%3Fhost%3D${fakeHostName}%26uuid%3D${fakeUserID}%26edgetunnel%3Dcmliu%26proxyip%3D${RproxyIP}&insert=false&config=${encodeURIComponent(subconfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
        } else if (userAgent.includes('sing-box') || userAgent.includes('singbox')) {
            url = `https://${subconverter}/sub?target=singbox&url=https%3A%2F%2F${sub}%2Fsub%3Fhost%3D${fakeHostName}%26uuid%3D${fakeUserID}%26edgetunnel%3Dcmliu%26proxyip%3D${RproxyIP}&insert=false&config=${encodeURIComponent(subconfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
        } else {
            url = `https://${sub}/sub?host=${fakeHostName}&uuid=${fakeUserID}&edgetunnel=cmliu&proxyip=${RproxyIP}`;
            isBase64 = true;
        }
        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": "CF-Workers-edgetunnel/cmliu",
                },
            });
            content = await response.text();
            return revertFakeInfo(content, userID, hostName, isBase64);
        } catch (error) {
            console.error("Error fetching content:", error);
            return `Error fetching content: ${error.message}`;
        }
    }
}
