import { BrowserWindow as e, Menu as t, app as n } from "electron";
import { fileURLToPath as r } from "url";
import i from "path";
//#region src/electron/main.js
var a = i.dirname(r(import.meta.url)), o = null, s = null;
function c() {
	o = new e({
		width: 1280,
		height: 800,
		minWidth: 800,
		minHeight: 600,
		webPreferences: {
			nodeIntegration: !1,
			contextIsolation: !0,
			preload: i.join(a, "preload.cjs")
		}
	}), o.webContents.on("did-finish-load", () => {
		s &&= (o.webContents.send("deep-link-token", s), null);
	}), process.env.VITE_DEV_SERVER_URL ? o.loadURL(process.env.VITE_DEV_SERVER_URL) : o.loadFile(i.join(a, "../../dist/index.html"));
}
console.log("argv:", process.argv), console.log("execPath:", process.execPath), process.env.VITE_DEV_SERVER_URL ? n.setAsDefaultProtocolClient("everifymo", process.execPath, [i.resolve(process.argv[1])]) : n.setAsDefaultProtocolClient("everifymo"), n.requestSingleInstanceLock() ? (n.on("second-instance", (e, t) => {
	let n = t.find((e) => e.startsWith("everifymo://"));
	n && l(n);
}), n.whenReady().then(() => {
	t.setApplicationMenu(null), c();
	let e = process.argv.find((e) => e.startsWith("everifymo://"));
	e && l(e);
})) : n.quit(), n.on("open-url", (e, t) => {
	l(t);
});
function l(e) {
	let t = new URL(e).searchParams.get("token");
	o ? (o.isMinimized() && o.restore(), o.show(), o.focus(), o.webContents.send("deep-link-token", t)) : s = t;
}
n.on("window-all-closed", () => {
	process.platform !== "darwin" && n.quit();
});
//#endregion
export {};
