using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Effects;
using System.Windows.Shapes;
using System.Windows.Threading;

namespace ZCodeHud
{
    public class MetricsData
    {
        public string status;
        public string sessionId;
        public string sessionTitle;
        public string modelName;
        public string modelId;
        public double tps;
        public double avgTps;
        public long inputTokens;
        public long outputTokens;
        public long reasoningTokens;
        public long cacheReadTokens;
        public double cacheHitRate;
        public double durationSec;
        public double ttftMs;
        public double costUsd;
        public double costCny;

        public long sessionInputTokens;
        public long sessionOutputTokens;
        public long sessionReasoningTokens;
        public long sessionCacheTokens;
        public double sessionCacheHitRate;
        public double sessionCostUsd;
        public double sessionCostCny;
        public double sessionDurationSec;
        public int turnsCount;
        public List<double> sparkline;
        public List<SessionItem> sessions;

        public bool quotaMode;
        public double totalQuota;
        public double remainingQuota;
        public double quotaPercent;
        public string quotaCurrency;
        public string quotaAlertLevel;

        public MetricsData()
        {
            status = "idle";
            sessionId = "";
            sessionTitle = "ZCode 实时监控";
            modelName = "Gemini 3.7 Flash High";
            modelId = "gemini-3.7-flash-high";
            tps = 0.0;
            avgTps = 0.0;
            inputTokens = 0;
            outputTokens = 0;
            reasoningTokens = 0;
            cacheReadTokens = 0;
            cacheHitRate = 0.0;
            durationSec = 0.0;
            ttftMs = 0.0;
            costUsd = 0.0;
            costCny = 0.0;

            sessionInputTokens = 0;
            sessionOutputTokens = 0;
            sessionReasoningTokens = 0;
            sessionCacheTokens = 0;
            sessionCacheHitRate = 0.0;
            sessionCostUsd = 0.0;
            sessionCostCny = 0.0;
            sessionDurationSec = 0.0;
            turnsCount = 0;
            sparkline = new List<double>();
            sessions = new List<SessionItem>();

            quotaMode = false;
            totalQuota = 100.0;
            remainingQuota = 100.0;
            quotaPercent = 100.0;
            quotaCurrency = "CNY";
            quotaAlertLevel = "normal";
        }
    }

    public class SessionItem
    {
        public string id;
        public string title;
        public long timeUpdated;
        public string taskType;

        public SessionItem()
        {
            id = "";
            title = "";
            timeUpdated = 0;
            taskType = "";
        }
    }

    public class CustomPricingSettings
    {
        public bool enabled;
        public double input;
        public double output;
        public double cacheRead;
        public double usdToCny;

        public CustomPricingSettings()
        {
            enabled = false;
            input = 0.15;
            output = 0.60;
            cacheRead = 0.0375;
            usdToCny = 7.23;
        }
    }

    public class QuotaSettings
    {
        public bool enabled;
        public double totalQuota;
        public string currency;

        public QuotaSettings()
        {
            enabled = false;
            totalQuota = 100.0;
            currency = "CNY";
        }
    }

    public class UserSettings
    {
        public string selectedSessionId;
        public string theme;
        public double opacity;
        public int pollIntervalMs;
        public string language;
        public bool alwaysOnTop;

        // Display Data Switches
        public bool showTps;
        public bool showAvgTps;
        public bool showSparkline;
        public bool showDuration;
        public bool showInputTokens;
        public bool showOutputTokens;
        public bool showReasoning;
        public bool showCache;
        public bool showCost;
        public bool showSessionSummary;

        public CustomPricingSettings customPricing;
        public QuotaSettings quotaSettings;

        // Raw JSON fragments owned by the Node poller (planSettings / customModels).
        // Preserved verbatim across SaveSettings so WPF saves never wipe poller-side config.
        public string rawPlanSettings;
        public string rawCustomModels;

        public UserSettings()
        {
            selectedSessionId = "auto";
            theme = "AppleGlass";
            opacity = 0.95;
            pollIntervalMs = 500;
            language = "zh-CN";
            alwaysOnTop = true;

            showTps = true;
            showAvgTps = true;
            showSparkline = true;
            showDuration = true;
            showInputTokens = true;
            showOutputTokens = true;
            showReasoning = true;
            showCache = true;
            showCost = true;
            showSessionSummary = true;

            customPricing = new CustomPricingSettings();
            quotaSettings = new QuotaSettings();
        }
    }

    public static class SimpleJson
    {
        public static string UnescapeString(string str)
        {
            if (string.IsNullOrEmpty(str)) return "";
            // Single-pass unescape. The previous chained String.Replace ran
            // `\\\\` -> `\\` BEFORE the `\n` handling, so the literal JSON
            // sequence "\\n" (backslash + 'n') was wrongly corrupted into a
            // newline character.
            var sb = new System.Text.StringBuilder(str.Length);
            for (int i = 0; i < str.Length; i++)
            {
                char c = str[i];
                if (c != '\\' || i + 1 >= str.Length)
                {
                    sb.Append(c);
                    continue;
                }
                char n = str[i + 1];
                switch (n)
                {
                    case '"': sb.Append('"'); i++; break;
                    case '\\': sb.Append('\\'); i++; break;
                    case '/': sb.Append('/'); i++; break;
                    case 'b': sb.Append('\b'); i++; break;
                    case 'f': sb.Append('\f'); i++; break;
                    case 'n': sb.Append('\n'); i++; break;
                    case 'r': sb.Append('\r'); i++; break;
                    case 't': sb.Append('\t'); i++; break;
                    case 'u':
                        if (i + 5 < str.Length)
                        {
                            int code;
                            if (int.TryParse(str.Substring(i + 2, 4), System.Globalization.NumberStyles.HexNumber,
                                System.Globalization.CultureInfo.InvariantCulture, out code))
                            {
                                sb.Append((char)code);
                                i += 5;
                            }
                            else
                            {
                                sb.Append(c);
                            }
                        }
                        else
                        {
                            sb.Append(c);
                        }
                        break;
                    default: sb.Append(c); break;
                }
            }
            return sb.ToString();
        }

        /// <summary>
        /// Extracts the inner content of the JSON object/array bound to the
        /// given key using a string-aware balanced-bracket scan. Naive lazy
        /// regexes (`\{(.*?)\}` / tail-anchored `...\}\s*$`) either failed to
        /// match or truncated whenever a string value contained braces,
        /// brackets, or when keys followed the block in the document.
        /// </summary>
        public static string ExtractBalancedBlock(string json, string key)
        {
            if (string.IsNullOrEmpty(json) || string.IsNullOrEmpty(key)) return null;
            string keyPattern = "\"" + key + "\"";
            int keyIdx = json.IndexOf(keyPattern, StringComparison.Ordinal);
            while (keyIdx >= 0)
            {
                // Require an exact key match: the character before the match
                // must not be part of a longer key name (e.g. "quotaSettings"
                // vs "planSettings" both containing "Settings").
                bool leftOk = keyIdx == 0 || json[keyIdx - 1] != '_' && !char.IsLetterOrDigit(json[keyIdx - 1]);
                int pos = keyIdx + keyPattern.Length;
                while (pos < json.Length && char.IsWhiteSpace(json[pos])) pos++;
                if (leftOk && pos < json.Length && json[pos] == ':')
                {
                    pos++;
                    while (pos < json.Length && char.IsWhiteSpace(json[pos])) pos++;
                    if (pos < json.Length && (json[pos] == '{' || json[pos] == '['))
                    {
                        return ScanBalanced(json, pos);
                    }
                }
                keyIdx = json.IndexOf(keyPattern, keyIdx + keyPattern.Length, StringComparison.Ordinal);
            }
            return null;
        }

        /// <summary>
        /// Given the index of an opening '{' or '[', returns the inner content
        /// between that bracket and its matching close, skipping over string
        /// literals (including escape sequences).
        /// </summary>
        private static string ScanBalanced(string json, int openIdx)
        {
            int depth = 0;
            bool inString = false;
            bool escaped = false;
            for (int i = openIdx; i < json.Length; i++)
            {
                char c = json[i];
                if (inString)
                {
                    if (escaped) { escaped = false; }
                    else if (c == '\\') { escaped = true; }
                    else if (c == '"') { inString = false; }
                    continue;
                }
                if (c == '"') { inString = true; continue; }
                if (c == '{' || c == '[') { depth++; }
                else if (c == '}' || c == ']')
                {
                    depth--;
                    if (depth == 0)
                    {
                        return json.Substring(openIdx + 1, i - openIdx - 1);
                    }
                }
            }
            return null;
        }

        public static string GetString(string json, string key, string defVal)
        {
            if (string.IsNullOrEmpty(json)) return defVal;
            var match = Regex.Match(json, "\"" + Regex.Escape(key) + "\"\\s*:\\s*\"((?:\\\\.|[^\"\\\\])*)\"");
            return match.Success ? UnescapeString(match.Groups[1].Value) : defVal;
        }

        public static double GetDouble(string json, string key, double defVal)
        {
            if (string.IsNullOrEmpty(json)) return defVal;
            var match = Regex.Match(json, "\"" + Regex.Escape(key) + "\"\\s*:\\s*([\\-+]?[0-9]*\\.?[0-9]+(?:[eE][\\-+]?[0-9]+)?)");
            if (match.Success)
            {
                double v;
                if (double.TryParse(match.Groups[1].Value, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out v))
                    return v;
            }
            return defVal;
        }

        public static long GetLong(string json, string key, long defVal)
        {
            if (string.IsNullOrEmpty(json)) return defVal;
            var match = Regex.Match(json, "\"" + Regex.Escape(key) + "\"\\s*:\\s*([\\-+]?[0-9]+)");
            if (match.Success)
            {
                long v;
                if (long.TryParse(match.Groups[1].Value, out v))
                    return v;
            }
            return defVal;
        }

        public static int GetInt(string json, string key, int defVal)
        {
            return (int)GetLong(json, key, defVal);
        }

        public static bool GetBool(string json, string key, bool defVal)
        {
            if (string.IsNullOrEmpty(json)) return defVal;
            var match = Regex.Match(json, "\"" + Regex.Escape(key) + "\"\\s*:\\s*(true|false)", RegexOptions.IgnoreCase);
            return match.Success ? match.Groups[1].Value.ToLower() == "true" : defVal;
        }

        public static List<double> GetDoubleList(string json, string key)
        {
            var list = new List<double>();
            if (string.IsNullOrEmpty(json)) return list;
            var match = Regex.Match(json, "\"" + Regex.Escape(key) + "\"\\s*:\\s*\\[([^\\]]*)\\]", RegexOptions.Singleline);
            if (match.Success)
            {
                var raw = match.Groups[1].Value;
                var parts = raw.Split(new char[] { ',', '\n', '\r', '\t' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var p in parts)
                {
                    var trimmed = p.Trim();
                    if (string.IsNullOrEmpty(trimmed)) continue;
                    double v;
                    if (double.TryParse(trimmed, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out v))
                        list.Add(v);
                }
            }
            return list;
        }

        public static List<SessionItem> GetSessions(string json)
        {
            var list = new List<SessionItem>();
            if (string.IsNullOrEmpty(json)) return list;

            // FIX: the old tail-anchored regex
            //   "sessions"\s*:\s*\[(.*?)\]\s*(,\s*"|\}\s*)$
            // never matched the poller's real payload, because "sessions" is
            // followed by `,\n "updatedAt": ... }` — the required `,`/`}`-at-
            // end-of-input could never line up. Result: the WPF session
            // dropdown was silently ALWAYS empty. We now locate the array with
            // a string-aware balanced scan, then split top-level {...} items
            // with the same scanner so titles containing braces/brackets no
            // longer truncate an item.
            var raw = ExtractBalancedBlock(json, "sessions");
            if (raw == null) return list;

            int depth = 0;
            bool inString = false;
            bool escaped = false;
            int start = -1;
            for (int i = 0; i < raw.Length; i++)
            {
                char c = raw[i];
                if (inString)
                {
                    if (escaped) { escaped = false; }
                    else if (c == '\\') { escaped = true; }
                    else if (c == '"') { inString = false; }
                    continue;
                }
                if (c == '"') { inString = true; continue; }
                if (c == '{')
                {
                    if (depth == 0) start = i;
                    depth++;
                }
                else if (c == '}')
                {
                    depth--;
                    if (depth == 0 && start >= 0)
                    {
                        var itemStr = raw.Substring(start + 1, i - start - 1);
                        var sess = new SessionItem();
                        sess.id = GetString(itemStr, "id", "");
                        sess.title = GetString(itemStr, "title", "");
                        sess.taskType = GetString(itemStr, "taskType", "");
                        sess.timeUpdated = GetLong(itemStr, "timeUpdated", 0);
                        if (!string.IsNullOrEmpty(sess.id))
                            list.Add(sess);
                        start = -1;
                    }
                }
            }
            return list;
        }
    }

    /// <summary>
    /// Order-preserving JSON object (key order survives a parse→mutate→serialize cycle,
    /// so the user's config.json layout is not churned by the first-run installer).
    /// </summary>
    public class JsonObj : System.Collections.Generic.IEnumerable<System.Collections.Generic.KeyValuePair<string, object>>
    {
        private readonly List<System.Collections.Generic.KeyValuePair<string, object>> _items =
            new List<System.Collections.Generic.KeyValuePair<string, object>>();

        public System.Collections.Generic.IEnumerator<System.Collections.Generic.KeyValuePair<string, object>> GetEnumerator()
        {
            return _items.GetEnumerator();
        }

        System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator()
        {
            return _items.GetEnumerator();
        }

        public bool TryGet(string key, out object val)
        {
            val = null;
            for (int i = 0; i < _items.Count; i++)
            {
                if (_items[i].Key == key)
                {
                    val = _items[i].Value;
                    return true;
                }
            }
            return false;
        }

        public void Set(string key, object val)
        {
            for (int i = 0; i < _items.Count; i++)
            {
                if (_items[i].Key == key)
                {
                    _items[i] = new System.Collections.Generic.KeyValuePair<string, object>(key, val);
                    return;
                }
            }
            _items.Add(new System.Collections.Generic.KeyValuePair<string, object>(key, val));
        }
    }

    /// <summary>
    /// Minimal JSON parse/serialize engine (C#5 compatible, no external deps).
    /// Values map to: JsonObj, List&lt;object&gt;, string, bool, long, double, null.
    /// </summary>
    public static class MiniJson
    {
        public static object Parse(string text)
        {
            if (text == null) throw new FormatException("null input");
            int i = 0;
            object value = ParseValue(text, ref i);
            SkipWs(text, ref i);
            if (i < text.Length) throw new FormatException("Trailing characters at " + i);
            return value;
        }

        private static void SkipWs(string t, ref int i)
        {
            while (i < t.Length && (t[i] == ' ' || t[i] == '\t' || t[i] == '\n' || t[i] == '\r')) i++;
        }

        private static object ParseValue(string t, ref int i)
        {
            SkipWs(t, ref i);
            if (i >= t.Length) throw new FormatException("Unexpected end of input");
            char c = t[i];
            if (c == '{') return ParseObject(t, ref i);
            if (c == '[') return ParseArray(t, ref i);
            if (c == '"') return ParseString(t, ref i);
            if (t.IndexOf("true", i, StringComparison.Ordinal) == i) { i += 4; return true; }
            if (t.IndexOf("false", i, StringComparison.Ordinal) == i) { i += 5; return false; }
            if (t.IndexOf("null", i, StringComparison.Ordinal) == i) { i += 4; return null; }
            return ParseNumber(t, ref i);
        }

        private static JsonObj ParseObject(string t, ref int i)
        {
            var obj = new JsonObj();
            i++; // consume '{'
            SkipWs(t, ref i);
            if (i < t.Length && t[i] == '}') { i++; return obj; }
            while (true)
            {
                SkipWs(t, ref i);
                if (i >= t.Length || t[i] != '"') throw new FormatException("Expected key at " + i);
                string key = ParseString(t, ref i);
                SkipWs(t, ref i);
                if (i >= t.Length || t[i] != ':') throw new FormatException("Expected ':' at " + i);
                i++;
                obj.Set(key, ParseValue(t, ref i));
                SkipWs(t, ref i);
                if (i >= t.Length) throw new FormatException("Unterminated object");
                if (t[i] == ',') { i++; continue; }
                if (t[i] == '}') { i++; return obj; }
                throw new FormatException("Expected ',' or '}' at " + i);
            }
        }

        private static List<object> ParseArray(string t, ref int i)
        {
            var list = new List<object>();
            i++; // consume '['
            SkipWs(t, ref i);
            if (i < t.Length && t[i] == ']') { i++; return list; }
            while (true)
            {
                list.Add(ParseValue(t, ref i));
                SkipWs(t, ref i);
                if (i >= t.Length) throw new FormatException("Unterminated array");
                if (t[i] == ',') { i++; continue; }
                if (t[i] == ']') { i++; return list; }
                throw new FormatException("Expected ',' or ']' at " + i);
            }
        }

        private static string ParseString(string t, ref int i)
        {
            i++; // consume '"'
            var sb = new System.Text.StringBuilder();
            while (i < t.Length)
            {
                char c = t[i];
                if (c == '"') { i++; return sb.ToString(); }
                if (c == '\\')
                {
                    i++;
                    if (i >= t.Length) break;
                    char e = t[i];
                    if (e == '"') sb.Append('"');
                    else if (e == '\\') sb.Append('\\');
                    else if (e == '/') sb.Append('/');
                    else if (e == 'b') sb.Append('\b');
                    else if (e == 'f') sb.Append('\f');
                    else if (e == 'n') sb.Append('\n');
                    else if (e == 'r') sb.Append('\r');
                    else if (e == 't') sb.Append('\t');
                    else if (e == 'u')
                    {
                        if (i + 4 >= t.Length) throw new FormatException("Bad \\u escape");
                        sb.Append((char)Convert.ToInt32(t.Substring(i + 1, 4), 16));
                        i += 4;
                    }
                    else throw new FormatException("Bad escape '\\" + e + "'");
                    i++;
                }
                else
                {
                    sb.Append(c);
                    i++;
                }
            }
            throw new FormatException("Unterminated string");
        }

        private static object ParseNumber(string t, ref int i)
        {
            int start = i;
            if (i < t.Length && (t[i] == '-' || t[i] == '+')) i++;
            bool isFloat = false;
            while (i < t.Length)
            {
                char c = t[i];
                if (c >= '0' && c <= '9') { i++; continue; }
                if (c == '.' || c == 'e' || c == 'E') { isFloat = true; i++; continue; }
                if ((c == '-' || c == '+') && (t[i - 1] == 'e' || t[i - 1] == 'E')) { i++; continue; }
                break;
            }
            string num = t.Substring(start, i - start);
            if (!isFloat)
            {
                long l;
                if (long.TryParse(num, System.Globalization.NumberStyles.Integer, System.Globalization.CultureInfo.InvariantCulture, out l))
                    return l;
            }
            double d;
            if (double.TryParse(num, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out d))
                return d;
            throw new FormatException("Bad number '" + num + "'");
        }

        public static string Serialize(object value)
        {
            var sb = new System.Text.StringBuilder();
            WriteValue(sb, value);
            return sb.ToString();
        }

        private static void WriteValue(System.Text.StringBuilder sb, object value)
        {
            if (value == null) { sb.Append("null"); return; }
            if (value is bool) { sb.Append((bool)value ? "true" : "false"); return; }
            if (value is long) { sb.Append(((long)value).ToString(System.Globalization.CultureInfo.InvariantCulture)); return; }
            if (value is int) { sb.Append(((int)value).ToString(System.Globalization.CultureInfo.InvariantCulture)); return; }
            if (value is double)
            {
                double d = (double)value;
                if (d == Math.Floor(d) && Math.Abs(d) < 1e15)
                    sb.Append(((long)d).ToString(System.Globalization.CultureInfo.InvariantCulture));
                else
                    sb.Append(d.ToString("R", System.Globalization.CultureInfo.InvariantCulture));
                return;
            }
            if (value is string) { WriteString(sb, (string)value); return; }
            var jsonObj = value as JsonObj;
            if (jsonObj != null)
            {
                sb.Append('{');
                bool first = true;
                foreach (var kv in jsonObj)
                {
                    if (!first) sb.Append(',');
                    first = false;
                    WriteString(sb, kv.Key);
                    sb.Append(':');
                    WriteValue(sb, kv.Value);
                }
                sb.Append('}');
                return;
            }
            var list = value as List<object>;
            if (list != null)
            {
                sb.Append('[');
                for (int i = 0; i < list.Count; i++)
                {
                    if (i > 0) sb.Append(',');
                    WriteValue(sb, list[i]);
                }
                sb.Append(']');
                return;
            }
            throw new FormatException("Unsupported value type: " + value.GetType().Name);
        }

        private static void WriteString(System.Text.StringBuilder sb, string s)
        {
            sb.Append('"');
            for (int i = 0; i < s.Length; i++)
            {
                char c = s[i];
                if (c == '"') sb.Append("\\\"");
                else if (c == '\\') sb.Append("\\\\");
                else if (c == '\b') sb.Append("\\b");
                else if (c == '\f') sb.Append("\\f");
                else if (c == '\n') sb.Append("\\n");
                else if (c == '\r') sb.Append("\\r");
                else if (c == '\t') sb.Append("\\t");
                else if (c < ' ') sb.Append("\\u").Append(((int)c).ToString("x4"));
                else sb.Append(c);
            }
            sb.Append('"');
        }
    }

    /// <summary>
    /// First-run initializer (release-grade): any user can run this program without
    /// manual setup. On every launch it (idempotently) registers the ZCode
    /// SessionStart hook so the HUD auto-starts with ZCode:
    ///   - config.json missing            -> creates it with just the hooks block
    ///   - hooks key missing              -> added, other top-level keys untouched
    ///   - hook already registered        -> launcher path self-heals to current dir
    ///   - config unparseable             -> backed up, hooks block written fresh
    /// All writes are preceded by a .hud-bak backup and are atomic-ish (tmp+replace).
    /// </summary>
    public static class ZCodeHookInstaller
    {
        public static string InstallReport = "not-run";

        public static bool EnsureInstalled(string baseDir)
        {
            try
            {
                string launcher = System.IO.Path.Combine(baseDir, "launch-hud.mjs");
                string home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
                string cfgPath = System.IO.Path.Combine(home, ".zcode", "cli", "config.json");
                return EnsureInstalledAt(cfgPath, launcher);
            }
            catch (Exception ex)
            {
                InstallReport = "error: " + ex.Message;
                return false;
            }
        }

        public static bool EnsureInstalledAt(string cfgPath, string launcherPath)
        {
            try
            {
                if (!File.Exists(launcherPath))
                {
                    InstallReport = "launch-hud.mjs missing beside exe";
                    return false;
                }

                string dir = System.IO.Path.GetDirectoryName(cfgPath);
                if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);

                JsonObj root;
                bool existed = File.Exists(cfgPath);
                if (existed)
                {
                    string text = File.ReadAllText(cfgPath);
                    try
                    {
                        root = MiniJson.Parse(text) as JsonObj;
                    }
                    catch (FormatException)
                    {
                        root = null;
                    }
                    if (root == null)
                    {
                        // Unparseable or non-object root: back it up, start a fresh object.
                        try { File.WriteAllText(cfgPath + ".hud-bak-" + DateTime.Now.ToString("yyyyMMddHHmmss"), text); }
                        catch { }
                        root = new JsonObj();
                        existed = false;
                    }
                }
                else
                {
                    root = new JsonObj();
                }

                object hooksBox;
                JsonObj hooks = root.TryGet("hooks", out hooksBox) ? hooksBox as JsonObj : null;
                if (hooks == null)
                {
                    hooks = new JsonObj();
                    root.Set("hooks", hooks);
                }
                hooks.Set("enabled", true);

                object eventsBox;
                JsonObj events = hooks.TryGet("events", out eventsBox) ? eventsBox as JsonObj : null;
                if (events == null)
                {
                    events = new JsonObj();
                    hooks.Set("events", events);
                }

                object sessionStartBox;
                List<object> entries = events.TryGet("SessionStart", out sessionStartBox) ? sessionStartBox as List<object> : null;
                if (entries == null)
                {
                    entries = new List<object>();
                    events.Set("SessionStart", entries);
                }

                // Look for a previous registration of this launcher (any install path).
                bool foundExisting = false;
                foreach (object entryBox in entries)
                {
                    JsonObj entry = entryBox as JsonObj;
                    if (entry == null) continue;
                    object innerListBox;
                    List<object> innerList = entry.TryGet("hooks", out innerListBox) ? innerListBox as List<object> : null;
                    if (innerList == null) continue;
                    foreach (object hookBox in innerList)
                    {
                        JsonObj hook = hookBox as JsonObj;
                        if (hook == null) continue;
                        object argsBox;
                        List<object> args = hook.TryGet("args", out argsBox) ? argsBox as List<object> : null;
                        if (args == null) continue;
                        bool isOurs = false;
                        foreach (object a in args)
                        {
                            string s = a as string;
                            if (s != null && s.IndexOf("launch-hud.mjs", StringComparison.OrdinalIgnoreCase) >= 0)
                            {
                                isOurs = true;
                                break;
                            }
                        }
                        if (isOurs)
                        {
                            foundExisting = true;
                            // Self-heal: point at the current install location.
                            var newArgs = new List<object>();
                            newArgs.Add(launcherPath);
                            hook.Set("type", "process");
                            hook.Set("command", "node");
                            hook.Set("args", newArgs);
                            hook.Set("timeoutMs", 10000L);
                            object sm;
                            if (!hook.TryGet("statusMessage", out sm))
                                hook.Set("statusMessage", "Launching ZCode TPS HUD");
                        }
                    }
                }

                if (!foundExisting)
                {
                    var inner = new JsonObj();
                    inner.Set("type", "process");
                    inner.Set("command", "node");
                    var args = new List<object>();
                    args.Add(launcherPath);
                    inner.Set("args", args);
                    inner.Set("timeoutMs", 10000L);
                    inner.Set("statusMessage", "Launching ZCode TPS HUD");
                    var innerList = new List<object>();
                    innerList.Add(inner);
                    var entry = new JsonObj();
                    entry.Set("hooks", innerList);
                    entries.Add(entry);
                }

                string serialized = MiniJson.Serialize(root);

                string tmpPath = cfgPath + ".hud-tmp";
                File.WriteAllText(tmpPath, serialized);
                if (existed)
                {
                    try { File.Copy(cfgPath, cfgPath + ".hud-bak", true); } catch { }
                    try
                    {
                        File.Replace(tmpPath, cfgPath, null);
                    }
                    catch (IOException)
                    {
                        File.Copy(tmpPath, cfgPath, true);
                        try { File.Delete(tmpPath); } catch { }
                    }
                    catch (PlatformNotSupportedException)
                    {
                        File.Copy(tmpPath, cfgPath, true);
                        try { File.Delete(tmpPath); } catch { }
                    }
                }
                else
                {
                    try
                    {
                        File.Move(tmpPath, cfgPath);
                    }
                    catch (IOException)
                    {
                        File.Copy(tmpPath, cfgPath, true);
                        try { File.Delete(tmpPath); } catch { }
                    }
                }

                InstallReport = foundExisting ? "hook-updated" : "hook-created";
                return true;
            }
            catch (Exception ex)
            {
                InstallReport = "error: " + ex.Message;
                return false;
            }
        }
    }

    public class App : Application
    {
#if HUD_HOOK_SELFTEST
        public static void Main(string[] args)
        {
            // Test harness build: node compile-selftest.mjs
            // args[0] = target config.json path, args[1] = launcher path
            bool ok = ZCodeHookInstaller.EnsureInstalledAt(args[0], args[1]);
            Console.WriteLine("RESULT=" + (ok ? "OK" : "FAIL") + " REPORT=" + ZCodeHookInstaller.InstallReport);
        }
#else
        [STAThread]
        public static void Main()
        {
            // Single-instance guard. The ZCode SessionStart hook launches this exe on
            // every new/resumed/cleared/compacted session; extra launches must exit
            // silently instead of stacking HUD windows.
            bool mutexCreatedNew;
            System.Threading.Mutex instanceMutex = new System.Threading.Mutex(true, "ZCodeHud_SingleInstance", out mutexCreatedNew);
            if (!mutexCreatedNew)
            {
                instanceMutex.Dispose();
                return;
            }

            try
            {
                // First-run initialization: register/self-heal the auto-start hook so
                // the HUD comes up with ZCode on any user's machine with zero setup.
                ZCodeHookInstaller.EnsureInstalled(AppDomain.CurrentDomain.BaseDirectory);
                StartupHelper.EnsureMetricsAndPoller();
                var app = new App();
                app.Run(new MainWindow());
            }
            catch (Exception ex)
            {
                try
                {
                    string logPath = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "hud-crash.log");
                    File.WriteAllText(logPath, "Timestamp: " + DateTime.Now.ToString("o") + "\n" + ex.ToString());
                }
                catch { }
                MessageBox.Show("ZCode-TPS-HUD 启动遇到异常:\n" + ex.Message, "启动错误", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally
            {
                GC.KeepAlive(instanceMutex);
                instanceMutex.ReleaseMutex();
                instanceMutex.Dispose();
            }
        }
#endif
    }

    public static class StartupHelper
    {
        /// <summary>
        /// Non-null when the Node runtime cannot run poll-metrics.mjs (missing
        /// node on PATH, or version older than 22.5 where node:sqlite does not
        /// exist). Surfaced in the HUD instead of failing silently.
        /// </summary>
        public static string NodeProblemMessage { get; private set; }

        static StartupHelper()
        {
            NodeProblemMessage = null;
        }

        /// <summary>
        /// Runs `node --version` with a hard 3s timeout and validates the
        /// minimum version required by the built-in node:sqlite module.
        /// Returns null when OK, otherwise a human-readable problem message.
        /// </summary>
        private static string DetectNodeProblem()
        {
            string versionText = null;
            try
            {
                var psi = new System.Diagnostics.ProcessStartInfo();
                psi.FileName = "node";
                psi.Arguments = "--version";
                psi.UseShellExecute = false;
                psi.RedirectStandardOutput = true;
                psi.RedirectStandardError = true;
                psi.CreateNoWindow = true;
                var proc = System.Diagnostics.Process.Start(psi);
                if (proc != null)
                {
                    if (proc.WaitForExit(3000))
                    {
                        versionText = proc.StandardOutput.ReadToEnd().Trim();
                    }
                    else
                    {
                        try { proc.Kill(); } catch { }
                    }
                }
            }
            catch { }

            if (string.IsNullOrEmpty(versionText))
                return "未检测到可用的 Node.js，实时数据采集器无法启动 (需要 Node.js 22.5+)";

            string v = versionText.TrimStart('v', 'V').Trim();
            string[] parts = v.Split('.');
            int major = 0;
            int minor = 0;
            if (parts.Length > 0) int.TryParse(parts[0], out major);
            if (parts.Length > 1) int.TryParse(parts[1], out minor);
            if (major < 22 || (major == 22 && minor < 5))
                return "Node.js 版本过低 (" + versionText + ")，采集器需要 22.5+ (node:sqlite)";
            return null;
        }

        public static void EnsureMetricsAndPoller()
        {
            try
            {
                // Detect the Node runtime ONCE before spawning anything; a
                // missing/ancient node previously crashed the poller instantly
                // with zero user-visible feedback (Process.Start errors were
                // swallowed by an empty catch).
                NodeProblemMessage = DetectNodeProblem();

                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string metricsPath = System.IO.Path.Combine(baseDir, "live-metrics.json");
                string pollerPath = System.IO.Path.Combine(baseDir, "poll-metrics.mjs");

                if (!File.Exists(metricsPath))
                {
                    string defaultJson = "{\n" +
                        "  \"status\": \"idle\",\n" +
                        "  \"sessionId\": \"auto\",\n" +
                        "  \"sessionTitle\": \"ZCode 实时监控\",\n" +
                        "  \"modelName\": \"Gemini 3.7 Flash High\",\n" +
                        "  \"modelId\": \"gemini-3.7-flash-high\",\n" +
                        "  \"tps\": 0.0,\n" +
                        "  \"avgTps\": 0.0,\n" +
                        "  \"inputTokens\": 0,\n" +
                        "  \"outputTokens\": 0,\n" +
                        "  \"reasoningTokens\": 0,\n" +
                        "  \"cacheReadTokens\": 0,\n" +
                        "  \"cacheHitRate\": 0.0,\n" +
                        "  \"durationSec\": 0.0,\n" +
                        "  \"ttftMs\": 320,\n" +
                        "  \"costUsd\": 0.00000,\n" +
                        "  \"costCny\": 0.0000,\n" +
                        "  \"sessionInputTokens\": 0,\n" +
                        "  \"sessionOutputTokens\": 0,\n" +
                        "  \"sessionReasoningTokens\": 0,\n" +
                        "  \"sessionCacheTokens\": 0,\n" +
                        "  \"sessionCacheHitRate\": 0.0,\n" +
                        "  \"sessionCostUsd\": 0.0000,\n" +
                        "  \"sessionCostCny\": 0.000,\n" +
                        "  \"sessionDurationSec\": 0.0,\n" +
                        "  \"turnsCount\": 0,\n" +
                        "  \"sparkline\": [0.0, 0.0],\n" +
                        "  \"quotaMode\": false,\n" +
                        "  \"totalQuota\": 100.0,\n" +
                        "  \"remainingQuota\": 100.0,\n" +
                        "  \"quotaPercent\": 100.0,\n" +
                        "  \"quotaCurrency\": \"CNY\",\n" +
                        "  \"quotaAlertLevel\": \"normal\",\n" +
                        "  \"sessions\": [\n" +
                        "    {\n" +
                        "      \"id\": \"auto\",\n" +
                        "      \"title\": \"自动追踪活跃会话\",\n" +
                        "      \"timeUpdated\": 0,\n" +
                        "      \"taskType\": \"chat\"\n" +
                        "    }\n" +
                        "  ],\n" +
                        "  \"updatedAt\": 0\n" +
                        "}";
                    File.WriteAllText(metricsPath, defaultJson);
                }

                if (File.Exists(pollerPath) && NodeProblemMessage == null)
                {
                    // Single-instance dedup: poll-metrics.mjs writes its PID into poller.lock
                    // and refreshes its mtime every 5s. Only spawn a new poller when the lock
                    // is missing, held by a dead process, or stale (heartbeat older than 15s).
                    bool pollerRunning = false;
                    string lockPath = System.IO.Path.Combine(baseDir, "poller.lock");
                    try
                    {
                        if (File.Exists(lockPath))
                        {
                            string raw = File.ReadAllText(lockPath).Trim();
                            int pid;
                            if (int.TryParse(raw, out pid) && pid > 0)
                            {
                                bool pidAlive = false;
                                try
                                {
                                    var existing = System.Diagnostics.Process.GetProcessById(pid);
                                    if (existing != null && !existing.HasExited)
                                        pidAlive = true;
                                }
                                catch (ArgumentException)
                                {
                                    pidAlive = false; // PID no longer exists -> stale lock
                                }
                                catch (InvalidOperationException)
                                {
                                    pidAlive = true;
                                }

                                if (pidAlive)
                                {
                                    // Heartbeat check guards against PID reuse after a force-kill
                                    DateTime lockMtime = File.GetLastWriteTimeUtc(lockPath);
                                    bool lockStale = (DateTime.UtcNow - lockMtime).TotalMilliseconds > 15000;
                                    pollerRunning = !lockStale;
                                }
                            }
                        }
                    }
                    catch { }

                    if (!pollerRunning)
                    {
                        var psi = new System.Diagnostics.ProcessStartInfo();
                        psi.FileName = "node";
                        psi.Arguments = "\"" + pollerPath + "\"";
                        psi.WorkingDirectory = baseDir;
                        psi.CreateNoWindow = true;
                        psi.UseShellExecute = false;
                        psi.WindowStyle = System.Diagnostics.ProcessWindowStyle.Hidden;

                        try
                        {
                            System.Diagnostics.Process.Start(psi);
                        }
                        catch { }
                    }
                }
            }
            catch { }
        }
    }

    /// <summary>
    /// Cache of frozen SolidColorBrush instances. RenderData used to allocate
    /// several new brushes every 500ms tick; frozen brushes are safe to share
    /// across UI elements and avoid WPF's per-instance change-handler overhead.
    /// </summary>
    internal static class FrozenBrushCache
    {
        private static readonly Dictionary<long, SolidColorBrush> _cache = new Dictionary<long, SolidColorBrush>();

        public static SolidColorBrush Get(byte a, byte r, byte g, byte b)
        {
            long key = ((long)a << 24) | ((long)r << 16) | ((long)g << 8) | (long)b;
            SolidColorBrush brush;
            if (!_cache.TryGetValue(key, out brush))
            {
                brush = new SolidColorBrush(Color.FromArgb(a, r, g, b));
                brush.Freeze();
                _cache[key] = brush;
            }
            return brush;
        }

        public static SolidColorBrush Get(byte r, byte g, byte b)
        {
            return Get(255, r, g, b);
        }

        public static SolidColorBrush Get(Color c)
        {
            return Get(c.A, c.R, c.G, c.B);
        }
    }

    /// <summary>
    /// Extracts the Win32 icon embedded via csc /win32icon and shares it between
    /// the window title bar, the taskbar entry and the NotifyIcon tray icon.
    /// </summary>
    internal static class AppIconProvider
    {
        private static System.Drawing.Icon _cached;

        public static System.Drawing.Icon Icon
        {
            get
            {
                if (_cached == null)
                {
                    try
                    {
                        string exePath = System.Reflection.Assembly.GetExecutingAssembly().Location;
                        if (!string.IsNullOrEmpty(exePath) && System.IO.File.Exists(exePath))
                            _cached = System.Drawing.Icon.ExtractAssociatedIcon(exePath);
                    }
                    catch { }
                }
                return _cached;
            }
        }

        public static void ApplyToWindow(Window window)
        {
            var icon = Icon;
            if (icon == null || window == null) return;
            try
            {
                var bmp = System.Windows.Interop.Imaging.CreateBitmapSourceFromHIcon(
                    icon.Handle,
                    System.Windows.Int32Rect.Empty,
                    System.Windows.Media.Imaging.BitmapSizeOptions.FromEmptyOptions());
                bmp.Freeze();
                window.Icon = bmp;
            }
            catch { }
        }
    }

    public class MainWindow : Window
    {
        private readonly string _metricsPath;
        private readonly string _settingsPath;
        private readonly DispatcherTimer _timer;
        private UserSettings _settings;

        // UI Controls
        private Border _mainCard;
        private Border _statusBadge;
        private TextBlock _statusText;
        private TextBlock _sessionTitleText;
        private TextBlock _modelText;
        private TextBlock _tpsValue;
        private TextBlock _tpsSub;
        private Border _avgTpsBadge;
        private TextBlock _avgTpsVal;
        private Border _waveformCard;
        private Canvas _sparklineCanvas;

        // Cost vs Quota
        private StackPanel _costPanel;
        private TextBlock _costVal;
        private TextBlock _costSub;
        private StackPanel _quotaPanel;
        private TextBlock _quotaVal;
        private TextBlock _quotaSub;
        private Border _quotaProgressBar;
        private Rectangle _quotaProgressFill;

        // Smart Fluid Metric Cards
        private WrapPanel _metricsWrapPanel;
        private Border _cardInput;
        private Border _cardOutput;
        private Border _cardCost;
        private Border _cardCache;
        private Border _cardDuration;
        private Border _cardReasoning;

        private TextBlock _inputTokensVal;
        private TextBlock _outputTokensVal;
        private TextBlock _reasoningVal;
        private TextBlock _cacheVal;
        private TextBlock _durationVal;
        private TextBlock _chipCostVal;

        private List<TextBlock> _chipLabels = new List<TextBlock>();
        private List<TextBlock> _chipValues = new List<TextBlock>();

        // Session aggregate container
        private Border _sessionSummaryCard;
        private TextBlock _sessionTokensVal;
        private TextBlock _sessionCostVal;
        private TextBlock _sessionTokensLbl;
        private TextBlock _sessionCostLbl;

        private SettingsWindow _settingsWindow;
        private MetricsData _currentMetrics;
        private string _activeTheme = "AppleGlass";

        // Perf/health state
        private TextBlock _warningText;
        private string _lastMetricsRaw;              // skip re-parse when poller payload unchanged
        private string _lastSparklineSig;            // skip sparkline rebuild when data unchanged
        private DateTime _lastHealthCheckUtc;        // poller heartbeat checked at most every 5s
        private string _lastWarningShown;

        public MainWindow()
        {
            _settings = new UserSettings();
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            _metricsPath = System.IO.Path.Combine(baseDir, "live-metrics.json");
            _settingsPath = System.IO.Path.Combine(baseDir, "settings.json");

            _timer = new DispatcherTimer();
            _timer.Interval = TimeSpan.FromMilliseconds(Math.Max(200, _settings.pollIntervalMs));
            _timer.Tick += (s, e) => UpdateMetrics();

            LoadSettings();
            InitializeWindow();
            InitializeTrayIcon();

            // Surface poller/node problems immediately instead of silently
            // showing zeros forever.
            UpdatePollerHealthWarning();

            this.Loaded += (s, e) =>
            {
                ApplyThemeAndSettings();
            };

            _timer.Start();
            UpdateMetrics();
        }

        public void LoadSettings()
        {
            try
            {
                if (File.Exists(_settingsPath))
                {
                    string json = File.ReadAllText(_settingsPath);
                    _settings.selectedSessionId = SimpleJson.GetString(json, "selectedSessionId", "auto");
                    _settings.theme = SimpleJson.GetString(json, "theme", "AppleGlass");
                    _settings.opacity = SimpleJson.GetDouble(json, "opacity", 0.95);
                    _settings.pollIntervalMs = SimpleJson.GetInt(json, "pollIntervalMs", 500);
                    _settings.language = SimpleJson.GetString(json, "language", "zh-CN");
                    _settings.alwaysOnTop = SimpleJson.GetBool(json, "alwaysOnTop", true);

                    _settings.showTps = SimpleJson.GetBool(json, "showTps", true);
                    _settings.showAvgTps = SimpleJson.GetBool(json, "showAvgTps", true);
                    _settings.showSparkline = SimpleJson.GetBool(json, "showSparkline", true);
                    _settings.showDuration = SimpleJson.GetBool(json, "showDuration", true);
                    _settings.showInputTokens = SimpleJson.GetBool(json, "showInputTokens", true);
                    _settings.showOutputTokens = SimpleJson.GetBool(json, "showOutputTokens", true);
                    _settings.showReasoning = SimpleJson.GetBool(json, "showReasoning", true);
                    _settings.showCache = SimpleJson.GetBool(json, "showCache", true);
                    _settings.showCost = SimpleJson.GetBool(json, "showCost", true);
                    _settings.showSessionSummary = SimpleJson.GetBool(json, "showSessionSummary", true);

                    // Pricing (string-aware balanced extraction: the previous
                    // lazy `\{(.*?)\}` regex truncated whenever a value
                    // contained a '}' character)
                    var pJson = SimpleJson.ExtractBalancedBlock(json, "customPricing");
                    if (pJson != null)
                    {
                        _settings.customPricing.enabled = SimpleJson.GetBool(pJson, "enabled", false);
                        _settings.customPricing.input = SimpleJson.GetDouble(pJson, "input", 0.15);
                        _settings.customPricing.output = SimpleJson.GetDouble(pJson, "output", 0.60);
                        _settings.customPricing.cacheRead = SimpleJson.GetDouble(pJson, "cacheRead", 0.0375);
                        _settings.customPricing.usdToCny = SimpleJson.GetDouble(pJson, "usdToCny", 7.23);
                    }

                    // Quota
                    var qJson = SimpleJson.ExtractBalancedBlock(json, "quotaSettings");
                    if (qJson != null)
                    {
                        _settings.quotaSettings.enabled = SimpleJson.GetBool(qJson, "enabled", false);
                        _settings.quotaSettings.totalQuota = SimpleJson.GetDouble(qJson, "totalQuota", 100.0);
                        _settings.quotaSettings.currency = SimpleJson.GetString(qJson, "currency", "CNY");
                    }

                    // Preserve Node-poller-owned blocks (planSettings may nest
                    // arbitrary tiers/objects, so use the balanced scanner).
                    var planJson = SimpleJson.ExtractBalancedBlock(json, "planSettings");
                    if (planJson != null)
                    {
                        _settings.rawPlanSettings = "\"planSettings\": {" + planJson + "}";
                        // Single source of truth: the poller reads
                        // planSettings.enabled, so mirror it into the WPF quota
                        // checkbox state. Previously the WPF toggle wrote only
                        // quotaSettings.enabled, which the poller never read —
                        // turning the toggle off had no effect.
                        _settings.quotaSettings.enabled = SimpleJson.GetBool(planJson, "enabled", _settings.quotaSettings.enabled);
                    }
                    var cmJson = SimpleJson.ExtractBalancedBlock(json, "customModels");
                    if (cmJson != null)
                        _settings.rawCustomModels = "\"customModels\": {" + cmJson + "}";
                }
            }
            catch { }
        }

        private static string EscapeJson(string s)
        {
            if (s == null) return "";
            return s.Replace("\\", "\\\\").Replace("\"", "\\\"");
        }

        public void SaveSettings()
        {
            try
            {
                // Legacy csc.exe (C#5) friendly JSON assembly. Node-poller-owned blocks
                // (planSettings / customModels) are re-emitted verbatim so a WPF save
                // never erases quota plan or custom model pricing configuration.
                System.Text.StringBuilder sb = new System.Text.StringBuilder();
                sb.Append("{\n");
                sb.Append("  \"selectedSessionId\": \"").Append(EscapeJson(_settings.selectedSessionId)).Append("\",\n");
                sb.Append("  \"theme\": \"").Append(EscapeJson(_settings.theme)).Append("\",\n");
                sb.Append("  \"opacity\": ").Append(_settings.opacity.ToString("F2", System.Globalization.CultureInfo.InvariantCulture)).Append(",\n");
                sb.Append("  \"pollIntervalMs\": ").Append(_settings.pollIntervalMs.ToString(System.Globalization.CultureInfo.InvariantCulture)).Append(",\n");
                sb.Append("  \"language\": \"").Append(EscapeJson(_settings.language)).Append("\",\n");
                sb.Append("  \"alwaysOnTop\": ").Append(_settings.alwaysOnTop ? "true" : "false").Append(",\n");
                sb.Append("  \"showTps\": ").Append(_settings.showTps ? "true" : "false").Append(",\n");
                sb.Append("  \"showAvgTps\": ").Append(_settings.showAvgTps ? "true" : "false").Append(",\n");
                sb.Append("  \"showSparkline\": ").Append(_settings.showSparkline ? "true" : "false").Append(",\n");
                sb.Append("  \"showDuration\": ").Append(_settings.showDuration ? "true" : "false").Append(",\n");
                sb.Append("  \"showInputTokens\": ").Append(_settings.showInputTokens ? "true" : "false").Append(",\n");
                sb.Append("  \"showOutputTokens\": ").Append(_settings.showOutputTokens ? "true" : "false").Append(",\n");
                sb.Append("  \"showReasoning\": ").Append(_settings.showReasoning ? "true" : "false").Append(",\n");
                sb.Append("  \"showCache\": ").Append(_settings.showCache ? "true" : "false").Append(",\n");
                sb.Append("  \"showCost\": ").Append(_settings.showCost ? "true" : "false").Append(",\n");
                sb.Append("  \"showSessionSummary\": ").Append(_settings.showSessionSummary ? "true" : "false").Append(",\n");
                sb.Append("  \"customPricing\": {\n");
                sb.Append("    \"enabled\": ").Append(_settings.customPricing.enabled ? "true" : "false").Append(",\n");
                sb.Append("    \"input\": ").Append(_settings.customPricing.input.ToString("F4", System.Globalization.CultureInfo.InvariantCulture)).Append(",\n");
                sb.Append("    \"output\": ").Append(_settings.customPricing.output.ToString("F4", System.Globalization.CultureInfo.InvariantCulture)).Append(",\n");
                sb.Append("    \"cacheRead\": ").Append(_settings.customPricing.cacheRead.ToString("F4", System.Globalization.CultureInfo.InvariantCulture)).Append(",\n");
                sb.Append("    \"usdToCny\": ").Append(_settings.customPricing.usdToCny.ToString("F2", System.Globalization.CultureInfo.InvariantCulture)).Append("\n");
                sb.Append("  },\n");
                sb.Append("  \"quotaSettings\": {\n");
                sb.Append("    \"enabled\": ").Append(_settings.quotaSettings.enabled ? "true" : "false").Append(",\n");
                sb.Append("    \"totalQuota\": ").Append(_settings.quotaSettings.totalQuota.ToString("F2", System.Globalization.CultureInfo.InvariantCulture)).Append(",\n");
                sb.Append("    \"currency\": \"").Append(EscapeJson(_settings.quotaSettings.currency)).Append("\"\n");
                sb.Append("  }");
                // The poller reads quota enablement from planSettings.enabled.
                // Patch the preserved poller-owned fragment so the WPF quota
                // toggle actually takes effect (previously it only wrote
                // quotaSettings.enabled, which the poller never read). When no
                // fragment exists, synthesize a custom rolling-quota plan.
                string planFragment = _settings.rawPlanSettings;
                string enabledStr = _settings.quotaSettings.enabled ? "true" : "false";
                if (!string.IsNullOrEmpty(planFragment))
                {
                    var enabledRx = new Regex("\"enabled\"\\s*:\\s*(true|false)", RegexOptions.IgnoreCase);
                    planFragment = enabledRx.Replace(planFragment, "\"enabled\": " + enabledStr, 1);
                }
                else
                {
                    planFragment = "\"planSettings\": {\n    \"selectedPlan\": \"custom-plan\",\n    \"enabled\": " + enabledStr +
                        ",\n    \"totalQuota\": " + _settings.quotaSettings.totalQuota.ToString("F2", System.Globalization.CultureInfo.InvariantCulture) +
                        ",\n    \"currency\": \"" + EscapeJson(_settings.quotaSettings.currency) + "\"\n  }";
                }
                sb.Append(",\n  ").Append(planFragment);
                if (!string.IsNullOrEmpty(_settings.rawCustomModels))
                    sb.Append(",\n  ").Append(_settings.rawCustomModels);
                sb.Append("\n}");

                // Atomic swap: readers (hud-server.mjs deep-merge on POST,
                // poll-metrics.mjs mtime cache) must never observe a half-written
                // JSON. A partial read previously made the server's merge fall
                // back to a wholesale write, silently dropping WPF-owned keys.
                string tmpPath = _settingsPath + ".tmp";
                File.WriteAllText(tmpPath, sb.ToString());
                try
                {
                    if (File.Exists(_settingsPath))
                        File.Replace(tmpPath, _settingsPath, null);
                    else
                        File.Move(tmpPath, _settingsPath);
                }
                catch (IOException)
                {
                    // Best-effort fallback if the replace is blocked by a reader.
                    try { File.WriteAllText(_settingsPath, sb.ToString()); } catch { }
                    try { File.Delete(tmpPath); } catch { }
                }
            }
            catch { }
        }

        public void ApplyThemeAndSettings()
        {
            this.Topmost = _settings.alwaysOnTop;
            this.Opacity = Math.Max(0.3, Math.Min(1.0, _settings.opacity));
            if (_timer != null)
            {
                _timer.Interval = TimeSpan.FromMilliseconds(Math.Max(200, _settings.pollIntervalMs));
            }

            _activeTheme = _settings.theme;

            // 6 Refined UX Themes
            SolidColorBrush bgBrush;
            SolidColorBrush borderBrush;
            SolidColorBrush textPrimary;
            SolidColorBrush textSecondary;
            SolidColorBrush textMuted;
            SolidColorBrush accentBrush;
            SolidColorBrush cardBgBrush;
            SolidColorBrush cardBorderBrush;
            CornerRadius mainCornerRadius = new CornerRadius(18);

            switch (_settings.theme)
            {
                // 1. Google Material You (MD3)
                case "GoogleMaterial":
                case "google":
                    bgBrush = new SolidColorBrush(Color.FromRgb(240, 244, 249)); // Clean MD3 Tonal Surface
                    borderBrush = new SolidColorBrush(Color.FromRgb(194, 215, 255)); // Soft MD3 outline
                    textPrimary = new SolidColorBrush(Color.FromRgb(31, 31, 31)); // Charcoal Black (WCAG AAA)
                    textSecondary = new SolidColorBrush(Color.FromRgb(68, 71, 70));
                    textMuted = new SolidColorBrush(Color.FromRgb(114, 119, 117));
                    accentBrush = new SolidColorBrush(Color.FromRgb(11, 87, 208)); // Google MD3 Blue
                    cardBgBrush = new SolidColorBrush(Color.FromRgb(255, 255, 255)); // Pure White elevated chips
                    cardBorderBrush = new SolidColorBrush(Color.FromRgb(224, 227, 231));
                    mainCornerRadius = new CornerRadius(22);
                    break;

                // 2. Cyberpunk Neon (High contrast vibrant dark theme)
                case "CyberpunkNeon":
                case "cyberpunk":
                case "AnimeCyber":
                case "anime":
                    bgBrush = new SolidColorBrush(Color.FromArgb(248, 11, 15, 25)); // Deep space dark
                    borderBrush = new SolidColorBrush(Color.FromRgb(0, 240, 255)); // Neon Cyan border
                    textPrimary = new SolidColorBrush(Color.FromRgb(255, 255, 255)); // Pure Crisp White
                    textSecondary = new SolidColorBrush(Color.FromRgb(192, 132, 252)); // Cyber Violet
                    textMuted = new SolidColorBrush(Color.FromRgb(148, 163, 184)); // High visibility gray
                    accentBrush = new SolidColorBrush(Color.FromRgb(0, 240, 255)); // Bright Cyan
                    cardBgBrush = new SolidColorBrush(Color.FromArgb(40, 255, 255, 255));
                    cardBorderBrush = new SolidColorBrush(Color.FromArgb(90, 0, 240, 255));
                    mainCornerRadius = new CornerRadius(14);
                    break;

                // 3. Nordic Clean (Minimalist Slate & Emerald)
                case "NordicClean":
                case "nordic":
                    bgBrush = new SolidColorBrush(Color.FromRgb(248, 250, 252)); // Slate Crisp White
                    borderBrush = new SolidColorBrush(Color.FromRgb(203, 213, 225));
                    textPrimary = new SolidColorBrush(Color.FromRgb(15, 23, 42)); // Slate 900
                    textSecondary = new SolidColorBrush(Color.FromRgb(71, 85, 105));
                    textMuted = new SolidColorBrush(Color.FromRgb(100, 116, 139));
                    accentBrush = new SolidColorBrush(Color.FromRgb(16, 185, 129)); // Emerald Green
                    cardBgBrush = new SolidColorBrush(Color.FromRgb(255, 255, 255));
                    cardBorderBrush = new SolidColorBrush(Color.FromRgb(226, 232, 240));
                    mainCornerRadius = new CornerRadius(16);
                    break;

                // 4. Vintage Editorial (Newspaper)
                case "Newspaper":
                case "newspaper":
                    bgBrush = new SolidColorBrush(Color.FromRgb(246, 241, 232)); // Warm Vintage Paper
                    borderBrush = new SolidColorBrush(Color.FromRgb(40, 36, 32)); // Ink Black
                    textPrimary = new SolidColorBrush(Color.FromRgb(24, 21, 18)); // Pure Ink Black
                    textSecondary = new SolidColorBrush(Color.FromRgb(60, 54, 48));
                    textMuted = new SolidColorBrush(Color.FromRgb(100, 92, 84));
                    accentBrush = new SolidColorBrush(Color.FromRgb(153, 27, 27)); // Crimson Red Ink
                    cardBgBrush = new SolidColorBrush(Color.FromRgb(252, 249, 242));
                    cardBorderBrush = new SolidColorBrush(Color.FromRgb(40, 36, 32));
                    mainCornerRadius = new CornerRadius(6);
                    break;

                // 5. Obsidian Pro (Ultra-clear OLED Dark Mode with High Contrast)
                case "ObsidianPro":
                case "obsidian":
                case "DarkGlass":
                    bgBrush = new SolidColorBrush(Color.FromRgb(15, 17, 23)); // OLED Graphite Black
                    borderBrush = new SolidColorBrush(Color.FromArgb(90, 255, 255, 255)); // Crisp Outline
                    textPrimary = new SolidColorBrush(Color.FromRgb(248, 250, 252)); // Super Crisp White (100% visible)
                    textSecondary = new SolidColorBrush(Color.FromRgb(148, 163, 184)); // Bright Slate
                    textMuted = new SolidColorBrush(Color.FromRgb(100, 116, 139));
                    accentBrush = new SolidColorBrush(Color.FromRgb(56, 189, 248)); // Electric Sky Blue
                    cardBgBrush = new SolidColorBrush(Color.FromArgb(35, 255, 255, 255));
                    cardBorderBrush = new SolidColorBrush(Color.FromArgb(50, 255, 255, 255));
                    mainCornerRadius = new CornerRadius(18);
                    break;

                // 6. Apple Glass (Cupertino Translucent Frosted Glass) - Default
                case "AppleGlass":
                case "apple":
                default:
                    bgBrush = new SolidColorBrush(Color.FromArgb(210, 255, 255, 255)); // Highly refined translucent glass
                    borderBrush = new SolidColorBrush(Color.FromArgb(140, 255, 255, 255)); // Specular highlight border
                    textPrimary = new SolidColorBrush(Color.FromRgb(29, 29, 31)); // Apple Dark Charcoal
                    textSecondary = new SolidColorBrush(Color.FromRgb(81, 81, 84));
                    textMuted = new SolidColorBrush(Color.FromRgb(134, 134, 139));
                    accentBrush = new SolidColorBrush(Color.FromRgb(0, 113, 227)); // Apple System Blue
                    cardBgBrush = new SolidColorBrush(Color.FromArgb(150, 255, 255, 255));
                    cardBorderBrush = new SolidColorBrush(Color.FromArgb(60, 0, 0, 0));
                    mainCornerRadius = new CornerRadius(20);
                    break;
            }

            if (_mainCard != null)
            {
                _mainCard.Background = bgBrush;
                _mainCard.BorderBrush = borderBrush;
                _mainCard.CornerRadius = mainCornerRadius;
            }

            if (_sessionTitleText != null) _sessionTitleText.Foreground = textPrimary;
            if (_modelText != null) _modelText.Foreground = textSecondary;
            if (_tpsValue != null) _tpsValue.Foreground = accentBrush;
            if (_avgTpsVal != null) _avgTpsVal.Foreground = accentBrush;
            if (_costVal != null) _costVal.Foreground = accentBrush;

            if (_sessionTokensVal != null) _sessionTokensVal.Foreground = textPrimary;
            if (_sessionCostVal != null) _sessionCostVal.Foreground = accentBrush;
            if (_sessionTokensLbl != null) _sessionTokensLbl.Foreground = textMuted;
            if (_sessionCostLbl != null) _sessionCostLbl.Foreground = textMuted;

            // Apply card colors & label colors to all chips
            ApplyCardColor(_cardInput, cardBgBrush, cardBorderBrush);
            ApplyCardColor(_cardOutput, cardBgBrush, cardBorderBrush);
            ApplyCardColor(_cardCost, cardBgBrush, cardBorderBrush);
            ApplyCardColor(_cardCache, cardBgBrush, cardBorderBrush);
            ApplyCardColor(_cardDuration, cardBgBrush, cardBorderBrush);
            ApplyCardColor(_cardReasoning, cardBgBrush, cardBorderBrush);

            foreach (var lbl in _chipLabels)
            {
                if (lbl != null) lbl.Foreground = textMuted;
            }
            foreach (var val in _chipValues)
            {
                if (val != null) val.Foreground = textPrimary;
            }

            // Independent metric card toggles
            if (_tpsValue != null) _tpsValue.Visibility = _settings.showTps ? Visibility.Visible : Visibility.Collapsed;
            if (_tpsSub != null) _tpsSub.Visibility = _settings.showTps ? Visibility.Visible : Visibility.Collapsed;
            if (_avgTpsBadge != null) _avgTpsBadge.Visibility = _settings.showAvgTps ? Visibility.Visible : Visibility.Collapsed;
            if (_waveformCard != null) _waveformCard.Visibility = _settings.showSparkline ? Visibility.Visible : Visibility.Collapsed;

            if (_cardInput != null) _cardInput.Visibility = _settings.showInputTokens ? Visibility.Visible : Visibility.Collapsed;
            if (_cardOutput != null) _cardOutput.Visibility = _settings.showOutputTokens ? Visibility.Visible : Visibility.Collapsed;
            if (_cardCost != null) _cardCost.Visibility = _settings.showCost ? Visibility.Visible : Visibility.Collapsed;
            if (_cardCache != null) _cardCache.Visibility = _settings.showCache ? Visibility.Visible : Visibility.Collapsed;
            if (_cardDuration != null) _cardDuration.Visibility = _settings.showDuration ? Visibility.Visible : Visibility.Collapsed;
            if (_cardReasoning != null) _cardReasoning.Visibility = _settings.showReasoning ? Visibility.Visible : Visibility.Collapsed;

            if (_sessionSummaryCard != null) _sessionSummaryCard.Visibility = _settings.showSessionSummary ? Visibility.Visible : Visibility.Collapsed;

            if (_currentMetrics != null)
            {
                RenderData(_currentMetrics);
            }
        }

        // --- Tray / taskbar presence --------------------------------------------------
        // The HUD is a borderless always-on-top overlay; without a taskbar entry and a
        // tray icon a minimized window used to be unrecoverable.
        private System.Windows.Forms.NotifyIcon _trayIcon;

        private void InitializeTrayIcon()
        {
            try
            {
                var icon = AppIconProvider.Icon;
                if (icon == null) return;
                _trayIcon = new System.Windows.Forms.NotifyIcon();
                _trayIcon.Icon = icon;
                _trayIcon.Text = "ZCodeHUD — TPS / 成本监控";
                _trayIcon.Visible = true;
                var menu = new System.Windows.Forms.ContextMenuStrip();
                menu.Items.Add("显示悬浮窗", null, new System.EventHandler((s, e) => RestoreFromTray()));
                menu.Items.Add("退出", null, new System.EventHandler((s, e) =>
                {
                    try { _trayIcon.Visible = false; } catch { }
                    this.Close();
                }));
                _trayIcon.ContextMenuStrip = menu;
                _trayIcon.DoubleClick += new System.EventHandler((s, e) => RestoreFromTray());
            }
            catch { }
        }

        private void RestoreFromTray()
        {
            try
            {
                this.Show();
                if (this.WindowState == WindowState.Minimized)
                    this.WindowState = WindowState.Normal;
                this.Activate();
                this.Topmost = _settings.alwaysOnTop;
            }
            catch { }
        }

        protected override void OnClosed(EventArgs e)
        {
            if (_trayIcon != null)
            {
                try { _trayIcon.Visible = false; _trayIcon.Dispose(); } catch { }
                _trayIcon = null;
            }
            base.OnClosed(e);
        }

        private void ApplyCardColor(Border card, Brush bg, Brush border)
        {
            if (card != null)
            {
                card.Background = bg;
                card.BorderBrush = border;
            }
        }

        private void InitializeWindow()
        {
            this.Title = "ZCode-TPS-HUD 实时监控";
            this.Width = 380;
            this.SizeToContent = SizeToContent.Height;
            this.WindowStyle = WindowStyle.None;
            this.AllowsTransparency = true;
            this.Background = Brushes.Transparent;
            this.Topmost = _settings.alwaysOnTop;
            this.Opacity = _settings.opacity;
            this.ShowInTaskbar = true;
            AppIconProvider.ApplyToWindow(this);

            // Safe multi-monitor aware position initialization with bounds clamping
            double workLeft = SystemParameters.WorkArea.Left;
            double workRight = SystemParameters.WorkArea.Right;
            double workTop = SystemParameters.WorkArea.Top;
            double workBottom = SystemParameters.WorkArea.Bottom;

            double targetLeft = workRight - 396;
            double targetTop = workTop + 24;

            if (targetLeft < workLeft || targetLeft > workRight - 100)
                targetLeft = Math.Max(workLeft, workRight - 396);
            if (targetTop < workTop || targetTop > workBottom - 100)
                targetTop = Math.Max(workTop, workTop + 24);

            this.Left = targetLeft;
            this.Top = targetTop;

            // Clean host grid without dirty margin shadows
            var hostGrid = new Grid();
            hostGrid.Margin = new Thickness(8);
            hostGrid.Background = Brushes.Transparent;

            _mainCard = new Border();
            _mainCard.CornerRadius = new CornerRadius(20);
            _mainCard.BorderThickness = new Thickness(1.2);
            _mainCard.Padding = new Thickness(14, 12, 14, 14);

            // Clean, non-dirty diffuse shadow with zero white clipping artifacts
            var shadow = new DropShadowEffect();
            shadow.Color = Colors.Black;
            shadow.BlurRadius = 18;
            shadow.ShadowDepth = 3;
            shadow.Opacity = 0.20;
            _mainCard.Effect = shadow;

            _mainCard.MouseLeftButtonDown += (s, e) =>
            {
                if (e.ButtonState == MouseButtonState.Pressed)
                    this.DragMove();
            };

            var mainStack = new StackPanel();

            // 1. Header Toolbar
            var headerGrid = new Grid();
            headerGrid.Margin = new Thickness(0, 0, 0, 10);
            headerGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = GridLength.Auto });
            headerGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });
            headerGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = GridLength.Auto });

            _statusBadge = new Border();
            _statusBadge.CornerRadius = new CornerRadius(10);
            _statusBadge.Padding = new Thickness(8, 2.5, 8, 2.5);
            _statusBadge.Margin = new Thickness(0, 0, 8, 0);
            _statusBadge.Background = new SolidColorBrush(Color.FromArgb(35, 16, 185, 129));
            _statusBadge.BorderBrush = new SolidColorBrush(Color.FromRgb(16, 185, 129));
            _statusBadge.BorderThickness = new Thickness(1);

            _statusText = new TextBlock();
            _statusText.Text = "就绪";
            _statusText.FontSize = 11;
            _statusText.FontWeight = FontWeights.Bold;
            _statusText.Foreground = new SolidColorBrush(Color.FromRgb(16, 185, 129));
            _statusBadge.Child = _statusText;
            Grid.SetColumn(_statusBadge, 0);

            _sessionTitleText = new TextBlock();
            _sessionTitleText.Text = "ZCode 会话";
            _sessionTitleText.FontSize = 12.5;
            _sessionTitleText.FontWeight = FontWeights.Bold;
            _sessionTitleText.Foreground = new SolidColorBrush(Color.FromRgb(29, 29, 31));
            _sessionTitleText.VerticalAlignment = VerticalAlignment.Center;
            _sessionTitleText.TextTrimming = TextTrimming.CharacterEllipsis;
            Grid.SetColumn(_sessionTitleText, 1);

            var actionStack = new StackPanel();
            actionStack.Orientation = Orientation.Horizontal;

            var btnSettings = CreateIconButton("⚙", "打开设置中心", (s, e) => OpenSettingsPage());
            var btnMinimize = CreateIconButton("—", "最小化", (s, e) => this.WindowState = WindowState.Minimized);
            var btnClose = CreateIconButton("✕", "关闭", (s, e) => this.Close());

            actionStack.Children.Add(btnSettings);
            actionStack.Children.Add(btnMinimize);
            actionStack.Children.Add(btnClose);
            Grid.SetColumn(actionStack, 2);

            headerGrid.Children.Add(_statusBadge);
            headerGrid.Children.Add(_sessionTitleText);
            headerGrid.Children.Add(actionStack);
            mainStack.Children.Add(headerGrid);

            // Poller / Node runtime health banner (collapsed unless a problem
            // such as a missing Node.js runtime or a dead poller is detected)
            _warningText = new TextBlock();
            _warningText.Text = "";
            _warningText.FontSize = 10.5;
            _warningText.FontWeight = FontWeights.SemiBold;
            _warningText.Foreground = FrozenBrushCache.Get(255, 180, 83, 9);
            _warningText.Margin = new Thickness(0, 0, 0, 6);
            _warningText.TextWrapping = TextWrapping.Wrap;
            _warningText.Visibility = Visibility.Collapsed;
            mainStack.Children.Add(_warningText);

            // 2. Primary Hero Banner (Real-time TPS, Avg TPS, Cost/Quota)
            var heroBorder = new Border();
            heroBorder.CornerRadius = new CornerRadius(14);
            heroBorder.Background = new SolidColorBrush(Color.FromArgb(24, 0, 113, 227));
            heroBorder.BorderBrush = new SolidColorBrush(Color.FromArgb(48, 0, 113, 227));
            heroBorder.BorderThickness = new Thickness(1);
            heroBorder.Padding = new Thickness(12, 10, 12, 10);
            heroBorder.Margin = new Thickness(0, 0, 0, 8);

            var heroGrid = new Grid();
            heroGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });
            heroGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = GridLength.Auto });

            var heroLeft = new StackPanel();
            _modelText = new TextBlock();
            _modelText.Text = "Gemini 3.7 Flash";
            _modelText.FontSize = 11;
            _modelText.Foreground = new SolidColorBrush(Color.FromRgb(81, 81, 84));
            _modelText.FontWeight = FontWeights.SemiBold;

            var tpsRow = new StackPanel();
            tpsRow.Orientation = Orientation.Horizontal;
            tpsRow.Margin = new Thickness(0, 2, 0, 0);

            _tpsValue = new TextBlock();
            _tpsValue.Text = "0.0";
            _tpsValue.FontSize = 28;
            _tpsValue.FontWeight = FontWeights.ExtraBold;
            _tpsValue.Foreground = new SolidColorBrush(Color.FromRgb(0, 113, 227));

            _tpsSub = new TextBlock();
            _tpsSub.Text = " TPS";
            _tpsSub.FontSize = 11;
            _tpsSub.FontWeight = FontWeights.Bold;
            _tpsSub.Foreground = new SolidColorBrush(Color.FromRgb(134, 134, 139));
            _tpsSub.VerticalAlignment = VerticalAlignment.Bottom;
            _tpsSub.Margin = new Thickness(3, 0, 8, 5);

            // Average TPS badge
            _avgTpsBadge = new Border();
            _avgTpsBadge.CornerRadius = new CornerRadius(6);
            _avgTpsBadge.Background = new SolidColorBrush(Color.FromArgb(35, 0, 113, 227));
            _avgTpsBadge.Padding = new Thickness(6, 2, 6, 2);
            _avgTpsBadge.VerticalAlignment = VerticalAlignment.Bottom;
            _avgTpsBadge.Margin = new Thickness(0, 0, 0, 4);

            var avgStack = new StackPanel();
            avgStack.Orientation = Orientation.Horizontal;
            var avgLbl = new TextBlock();
            avgLbl.Text = "均值 ";
            avgLbl.FontSize = 10;
            avgLbl.FontWeight = FontWeights.SemiBold;
            avgLbl.Foreground = new SolidColorBrush(Color.FromRgb(81, 81, 84));

            _avgTpsVal = new TextBlock();
            _avgTpsVal.Text = "0.0";
            _avgTpsVal.FontSize = 11.5;
            _avgTpsVal.FontWeight = FontWeights.Bold;
            _avgTpsVal.Foreground = new SolidColorBrush(Color.FromRgb(0, 113, 227));

            var avgUnit = new TextBlock();
            avgUnit.Text = " tok/s";
            avgUnit.FontSize = 9.5;
            avgUnit.Foreground = new SolidColorBrush(Color.FromRgb(134, 134, 139));

            avgStack.Children.Add(avgLbl);
            avgStack.Children.Add(_avgTpsVal);
            avgStack.Children.Add(avgUnit);
            _avgTpsBadge.Child = avgStack;

            tpsRow.Children.Add(_tpsValue);
            tpsRow.Children.Add(_tpsSub);
            tpsRow.Children.Add(_avgTpsBadge);

            heroLeft.Children.Add(_modelText);
            heroLeft.Children.Add(tpsRow);
            Grid.SetColumn(heroLeft, 0);

            // Right side: Cost or Quota Badge
            var heroRight = new StackPanel();
            heroRight.VerticalAlignment = VerticalAlignment.Center;
            heroRight.HorizontalAlignment = HorizontalAlignment.Right;

            var costBox = new StackPanel();
            _costSub = new TextBlock();
            _costSub.Text = "单轮预估费用";
            _costSub.FontSize = 9.5;
            _costSub.FontWeight = FontWeights.Bold;
            _costSub.Foreground = new SolidColorBrush(Color.FromRgb(134, 134, 139));
            _costSub.HorizontalAlignment = HorizontalAlignment.Right;

            _costVal = new TextBlock();
            _costVal.Text = "¥0.0000";
            _costVal.FontSize = 13;
            _costVal.FontWeight = FontWeights.Bold;
            _costVal.Foreground = new SolidColorBrush(Color.FromRgb(0, 113, 227));
            _costVal.HorizontalAlignment = HorizontalAlignment.Right;
            costBox.Children.Add(_costSub);
            costBox.Children.Add(_costVal);
            _costPanel = costBox;

            var quotaBox = new StackPanel();
            _quotaSub = new TextBlock();
            _quotaSub.Text = "剩余额度 (100%)";
            _quotaSub.FontSize = 9.5;
            _quotaSub.FontWeight = FontWeights.Bold;
            _quotaSub.Foreground = new SolidColorBrush(Color.FromRgb(16, 185, 129));
            _quotaSub.HorizontalAlignment = HorizontalAlignment.Right;

            _quotaVal = new TextBlock();
            _quotaVal.Text = "¥100.00";
            _quotaVal.FontSize = 13;
            _quotaVal.FontWeight = FontWeights.Bold;
            _quotaVal.Foreground = new SolidColorBrush(Color.FromRgb(16, 185, 129));
            _quotaVal.HorizontalAlignment = HorizontalAlignment.Right;
            quotaBox.Children.Add(_quotaSub);
            quotaBox.Children.Add(_quotaVal);
            quotaBox.Visibility = Visibility.Collapsed;
            _quotaPanel = quotaBox;

            heroRight.Children.Add(_costPanel);
            heroRight.Children.Add(_quotaPanel);
            Grid.SetColumn(heroRight, 1);

            heroGrid.Children.Add(heroLeft);
            heroGrid.Children.Add(heroRight);
            heroBorder.Child = heroGrid;
            mainStack.Children.Add(heroBorder);

            // Quota Progress Bar
            _quotaProgressBar = new Border();
            _quotaProgressBar.Height = 5;
            _quotaProgressBar.CornerRadius = new CornerRadius(2.5);
            _quotaProgressBar.Background = new SolidColorBrush(Color.FromArgb(30, 0, 0, 0));
            _quotaProgressBar.Margin = new Thickness(0, 0, 0, 8);
            _quotaProgressBar.Visibility = Visibility.Collapsed;

            var quotaCanvas = new Canvas();
            _quotaProgressFill = new Rectangle();
            _quotaProgressFill.Height = 5;
            _quotaProgressFill.Width = 320;
            _quotaProgressFill.RadiusX = 2.5;
            _quotaProgressFill.RadiusY = 2.5;
            _quotaProgressFill.Fill = new SolidColorBrush(Color.FromRgb(16, 185, 129));
            quotaCanvas.Children.Add(_quotaProgressFill);
            _quotaProgressBar.Child = quotaCanvas;
            mainStack.Children.Add(_quotaProgressBar);

            // 3. Dedicated Waveform Sparkline Card
            _waveformCard = new Border();
            _waveformCard.CornerRadius = new CornerRadius(10);
            _waveformCard.Background = new SolidColorBrush(Color.FromArgb(20, 0, 0, 0));
            _waveformCard.BorderBrush = new SolidColorBrush(Color.FromArgb(20, 0, 0, 0));
            _waveformCard.BorderThickness = new Thickness(1);
            _waveformCard.Padding = new Thickness(4);
            _waveformCard.Margin = new Thickness(0, 0, 0, 8);

            _sparklineCanvas = new Canvas();
            _sparklineCanvas.Height = 36;
            _sparklineCanvas.Background = Brushes.Transparent;
            _waveformCard.Child = _sparklineCanvas;
            mainStack.Children.Add(_waveformCard);

            // 4. Metric Chips (2x3 Fluid Layout)
            _metricsWrapPanel = new WrapPanel();
            _metricsWrapPanel.ItemWidth = 108;
            _metricsWrapPanel.Margin = new Thickness(0, 0, 0, 6);

            _cardInput = CreateMetricChip("输入 Tokens", out _inputTokensVal, "0");
            _cardOutput = CreateMetricChip("输出 Tokens", out _outputTokensVal, "0");
            _cardCache = CreateMetricChip("缓存命中率", out _cacheVal, "0.0%");
            _cardCache.ToolTip = "整段会话累计平均缓存命中率";
            _cardDuration = CreateMetricChip("耗时 · TTFT", out _durationVal, "0.0s");
            _cardReasoning = CreateMetricChip("思维链 Tokens", out _reasoningVal, "0");
            _cardCost = CreateMetricChip("单轮估算", out _chipCostVal, "¥0.0000");

            _metricsWrapPanel.Children.Add(_cardInput);
            _metricsWrapPanel.Children.Add(_cardOutput);
            _metricsWrapPanel.Children.Add(_cardCache);
            _metricsWrapPanel.Children.Add(_cardDuration);
            _metricsWrapPanel.Children.Add(_cardReasoning);
            mainStack.Children.Add(_metricsWrapPanel);

            // 5. Session Total Summary Card
            _sessionSummaryCard = new Border();
            _sessionSummaryCard.CornerRadius = new CornerRadius(10);
            _sessionSummaryCard.Background = new SolidColorBrush(Color.FromArgb(25, 0, 0, 0));
            _sessionSummaryCard.Padding = new Thickness(10, 7, 10, 7);
            _sessionSummaryCard.BorderBrush = new SolidColorBrush(Color.FromArgb(20, 0, 0, 0));
            _sessionSummaryCard.BorderThickness = new Thickness(1);

            var sessionSummaryGrid = new Grid();
            sessionSummaryGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });
            sessionSummaryGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });

            var sessCol1 = new StackPanel();
            _sessionTokensLbl = new TextBlock();
            _sessionTokensLbl.Text = "本会话累计消耗";
            _sessionTokensLbl.FontSize = 9.5;
            _sessionTokensLbl.Foreground = new SolidColorBrush(Color.FromRgb(134, 134, 139));
            sessCol1.Children.Add(_sessionTokensLbl);

            _sessionTokensVal = new TextBlock();
            _sessionTokensVal.Text = "0 Tokens (0轮)";
            _sessionTokensVal.FontSize = 11.5;
            _sessionTokensVal.FontWeight = FontWeights.Bold;
            _sessionTokensVal.Foreground = new SolidColorBrush(Color.FromRgb(29, 29, 31));
            sessCol1.Children.Add(_sessionTokensVal);

            var sessCol2 = new StackPanel();
            _sessionCostLbl = new TextBlock();
            _sessionCostLbl.Text = "累计总费用";
            _sessionCostLbl.FontSize = 9.5;
            _sessionCostLbl.Foreground = new SolidColorBrush(Color.FromRgb(134, 134, 139));
            sessCol2.Children.Add(_sessionCostLbl);

            _sessionCostVal = new TextBlock();
            _sessionCostVal.Text = "¥0.000 ($0.000)";
            _sessionCostVal.FontSize = 11.5;
            _sessionCostVal.FontWeight = FontWeights.Bold;
            _sessionCostVal.Foreground = new SolidColorBrush(Color.FromRgb(0, 113, 227));
            sessCol2.Children.Add(_sessionCostVal);

            Grid.SetColumn(sessCol1, 0);
            Grid.SetColumn(sessCol2, 1);
            sessionSummaryGrid.Children.Add(sessCol1);
            sessionSummaryGrid.Children.Add(sessCol2);

            _sessionSummaryCard.Child = sessionSummaryGrid;
            mainStack.Children.Add(_sessionSummaryCard);

            _mainCard.Child = mainStack;
            hostGrid.Children.Add(_mainCard);
            this.Content = hostGrid;
        }

        private Border CreateMetricChip(string label, out TextBlock valBlock, string defaultVal)
        {
            var card = new Border();
            card.CornerRadius = new CornerRadius(8);
            card.BorderThickness = new Thickness(1);
            card.Padding = new Thickness(7, 5, 7, 5);
            card.Margin = new Thickness(2);

            var p = new StackPanel();
            var lbl = new TextBlock();
            lbl.Text = label;
            lbl.FontSize = 9.5;
            lbl.FontWeight = FontWeights.SemiBold;
            lbl.Foreground = new SolidColorBrush(Color.FromRgb(134, 134, 139));
            _chipLabels.Add(lbl);

            valBlock = new TextBlock();
            valBlock.Text = defaultVal;
            valBlock.FontSize = 12;
            valBlock.FontWeight = FontWeights.Bold;
            valBlock.Foreground = new SolidColorBrush(Color.FromRgb(29, 29, 31));
            valBlock.Margin = new Thickness(0, 1, 0, 0);
            _chipValues.Add(valBlock);

            p.Children.Add(lbl);
            p.Children.Add(valBlock);
            card.Child = p;
            return card;
        }

        private Button CreateIconButton(string icon, string tooltip, RoutedEventHandler onClick)
        {
            var btn = new Button();
            btn.Content = icon;
            btn.ToolTip = tooltip;
            btn.Width = 24;
            btn.Height = 22;
            btn.Margin = new Thickness(2, 0, 2, 0);
            btn.Background = new SolidColorBrush(Color.FromArgb(25, 0, 0, 0));
            btn.Foreground = new SolidColorBrush(Color.FromRgb(81, 81, 84));
            btn.BorderThickness = new Thickness(0);
            btn.Cursor = Cursors.Hand;
            btn.FontSize = 11;
            btn.FontWeight = FontWeights.Bold;
            btn.Click += onClick;
            return btn;
        }

        private void OpenSettingsPage()
        {
            if (_settingsWindow != null && _settingsWindow.IsLoaded)
            {
                _settingsWindow.Activate();
                return;
            }

            // Re-read settings.json so the editor starts from the latest on-disk
            // state. The Web HUD or another writer may have changed customModels /
            // planSettings since this window was last opened; editing a stale
            // in-memory snapshot would overwrite those newer values on save.
            LoadSettings();

            _settingsWindow = new SettingsWindow(this, _settings, _currentMetrics != null ? _currentMetrics.sessions : new List<SessionItem>());
            _settingsWindow.Owner = this;
            _settingsWindow.Closed += (s, e) => { _settingsWindow = null; };
            _settingsWindow.Show();
        }

        private string SafeReadMetricsJson()
        {
            if (!File.Exists(_metricsPath)) return null;
            for (int retry = 0; retry < 3; retry++)
            {
                try
                {
                    using (var fs = new FileStream(_metricsPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete))
                    using (var reader = new StreamReader(fs, System.Text.Encoding.UTF8))
                    {
                        return reader.ReadToEnd();
                    }
                }
                catch (IOException)
                {
                    System.Threading.Thread.Sleep(5);
                }
                catch
                {
                    break;
                }
            }
            return null;
        }

        /// <summary>
        /// Shows a warning banner when the data poller cannot run (Node.js
        /// missing/too old, poller.lock missing, or its 5s heartbeat stale for
        /// more than 15s). Checked at most every 5 seconds.
        /// </summary>
        private void UpdatePollerHealthWarning()
        {
            try
            {
                if ((DateTime.UtcNow - _lastHealthCheckUtc).TotalMilliseconds < 5000) return;
                _lastHealthCheckUtc = DateTime.UtcNow;

                string problem = StartupHelper.NodeProblemMessage;
                if (problem == null)
                {
                    string lockPath = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "poller.lock");
                    if (!File.Exists(lockPath))
                    {
                        problem = "数据采集器未运行 (poller.lock 缺失) — 数据不会更新";
                    }
                    else
                    {
                        DateTime lockMtime = File.GetLastWriteTimeUtc(lockPath);
                        if ((DateTime.UtcNow - lockMtime).TotalMilliseconds > 15000)
                            problem = "数据采集器心跳丢失 (>15s) — 数据可能已停止更新";
                    }
                }

                if (problem != _lastWarningShown)
                {
                    _lastWarningShown = problem;
                    if (_warningText != null)
                    {
                        if (problem == null)
                        {
                            _warningText.Visibility = Visibility.Collapsed;
                        }
                        else
                        {
                            _warningText.Text = "⚠ " + problem;
                            _warningText.Visibility = Visibility.Visible;
                        }
                    }
                }
            }
            catch { }
        }

        private void UpdateMetrics()
        {
            try
            {
                string json = SafeReadMetricsJson();
                if (string.IsNullOrEmpty(json)) return;

                // The poller only rewrites live-metrics.json when its content
                // actually changed; skip the 25+ full-text regex scans and the
                // whole RenderData pass when it did not.
                if (json == _lastMetricsRaw)
                {
                    UpdatePollerHealthWarning();
                    return;
                }
                _lastMetricsRaw = json;

                var data = new MetricsData();
                data.status = SimpleJson.GetString(json, "status", "idle");
                data.sessionId = SimpleJson.GetString(json, "sessionId", "");
                data.sessionTitle = SimpleJson.GetString(json, "sessionTitle", "当前活跃会话");
                data.modelName = SimpleJson.GetString(json, "modelName", "Gemini 3.7 Flash");
                data.modelId = SimpleJson.GetString(json, "modelId", "gemini-3.7-flash-high");
                data.tps = SimpleJson.GetDouble(json, "tps", 0.0);
                data.avgTps = SimpleJson.GetDouble(json, "avgTps", data.tps);
                data.inputTokens = SimpleJson.GetLong(json, "inputTokens", 0);
                data.outputTokens = SimpleJson.GetLong(json, "outputTokens", 0);
                data.reasoningTokens = SimpleJson.GetLong(json, "reasoningTokens", 0);
                data.cacheReadTokens = SimpleJson.GetLong(json, "cacheReadTokens", 0);
                data.cacheHitRate = SimpleJson.GetDouble(json, "cacheHitRate", 0.0);
                data.durationSec = SimpleJson.GetDouble(json, "durationSec", 0.0);
                data.ttftMs = SimpleJson.GetDouble(json, "ttftMs", 0.0);
                data.costUsd = SimpleJson.GetDouble(json, "costUsd", 0.0);
                data.costCny = SimpleJson.GetDouble(json, "costCny", 0.0);

                data.sessionInputTokens = SimpleJson.GetLong(json, "sessionInputTokens", 0);
                data.sessionOutputTokens = SimpleJson.GetLong(json, "sessionOutputTokens", 0);
                data.sessionReasoningTokens = SimpleJson.GetLong(json, "sessionReasoningTokens", 0);
                data.sessionCacheTokens = SimpleJson.GetLong(json, "sessionCacheTokens", 0);
                data.sessionCacheHitRate = SimpleJson.GetDouble(json, "sessionCacheHitRate", 0.0);
                data.sessionCostUsd = SimpleJson.GetDouble(json, "sessionCostUsd", 0.0);
                data.sessionCostCny = SimpleJson.GetDouble(json, "sessionCostCny", 0.0);
                data.sessionDurationSec = SimpleJson.GetDouble(json, "sessionDurationSec", 0.0);
                data.turnsCount = SimpleJson.GetInt(json, "turnsCount", 0);
                data.sparkline = SimpleJson.GetDoubleList(json, "sparkline");
                data.sessions = SimpleJson.GetSessions(json);

                data.quotaMode = SimpleJson.GetBool(json, "quotaMode", false);
                data.totalQuota = SimpleJson.GetDouble(json, "totalQuota", 100.0);
                data.remainingQuota = SimpleJson.GetDouble(json, "remainingQuota", 100.0);
                data.quotaPercent = SimpleJson.GetDouble(json, "quotaPercent", 100.0);
                data.quotaCurrency = SimpleJson.GetString(json, "quotaCurrency", "CNY");
                data.quotaAlertLevel = SimpleJson.GetString(json, "quotaAlertLevel", "normal");

                _currentMetrics = data;
                RenderData(data);
            }
            catch { }
            UpdatePollerHealthWarning();
        }

        private void RenderData(MetricsData d)
        {
            if (d.status == "running")
            {
                _statusBadge.Background = FrozenBrushCache.Get(45, 0, 113, 227);
                _statusBadge.BorderBrush = FrozenBrushCache.Get(0, 113, 227);
                _statusText.Text = "⚡ 生成中";
                _statusText.Foreground = FrozenBrushCache.Get(0, 113, 227);
            }
            else
            {
                _statusBadge.Background = FrozenBrushCache.Get(35, 16, 185, 129);
                _statusBadge.BorderBrush = FrozenBrushCache.Get(16, 185, 129);
                _statusText.Text = "就绪";
                _statusText.Foreground = FrozenBrushCache.Get(16, 185, 129);
            }

            _sessionTitleText.Text = string.IsNullOrEmpty(d.sessionTitle) ? "当前活跃会话" : d.sessionTitle;
            _modelText.Text = d.modelName;

            _tpsValue.Text = d.tps.ToString("F1");
            _avgTpsVal.Text = d.avgTps.ToString("F1");

            _inputTokensVal.Text = d.inputTokens.ToString("N0");
            _outputTokensVal.Text = d.outputTokens.ToString("N0");
            _reasoningVal.Text = d.reasoningTokens > 0 ? d.reasoningTokens.ToString("N0") : "0";
            _costVal.Text = string.Format("¥{0:F4}", d.costCny);
            if (_chipCostVal != null) _chipCostVal.Text = string.Format("¥{0:F4}", d.costCny);
            // Conversation-wide cumulative average, not the last turn's instantaneous rate.
            _cacheVal.Text = string.Format("{0:F1}%", d.sessionCacheHitRate);
            _durationVal.Text = d.ttftMs > 0
                ? string.Format("{0:F1}s/{1:F0}ms", d.durationSec, d.ttftMs)
                : string.Format("{0:F1}s", d.durationSec);
            _durationVal.ToolTip = d.ttftMs > 0
                ? string.Format("生成耗时 {0:F1}s · 首字时延 TTFT {1:F0}ms", d.durationSec, d.ttftMs)
                : "生成耗时";

            _sessionTokensVal.Text = string.Format("{0:N0} Tokens ({1}轮)", (d.sessionInputTokens + d.sessionOutputTokens), d.turnsCount);
            _sessionCostVal.Text = string.Format("¥{0:F3} (${1:F4})", d.sessionCostCny, d.sessionCostUsd);

            if (d.quotaMode)
            {
                _costPanel.Visibility = Visibility.Collapsed;
                _quotaPanel.Visibility = Visibility.Visible;
                _quotaProgressBar.Visibility = Visibility.Visible;

                string sym = d.quotaCurrency == "USD" ? "$" : "¥";
                _quotaVal.Text = string.Format("{0}{1:F2}", sym, d.remainingQuota);
                _quotaSub.Text = string.Format("剩余额度 ({0:F1}%)", d.quotaPercent);

                Color quotaColor = Color.FromRgb(16, 185, 129);
                if (d.quotaPercent <= 5 || d.quotaAlertLevel == "critical")
                {
                    quotaColor = Color.FromRgb(239, 68, 68);
                }
                else if (d.quotaPercent <= 20 || d.quotaAlertLevel == "warning")
                {
                    quotaColor = Color.FromRgb(245, 158, 11);
                }

                _quotaVal.Foreground = FrozenBrushCache.Get(quotaColor);
                _quotaProgressFill.Fill = FrozenBrushCache.Get(quotaColor);
                _quotaProgressFill.Width = Math.Max(2, Math.Min(320, (d.quotaPercent / 100.0) * 320));
            }
            else
            {
                _costPanel.Visibility = Visibility.Visible;
                _quotaPanel.Visibility = Visibility.Collapsed;
                _quotaProgressBar.Visibility = Visibility.Collapsed;
            }

            DrawSparkline(d.sparkline);
        }

        private void DrawSparkline(List<double> points)
        {
            if (_sparklineCanvas == null || !_settings.showSparkline) return;

            // PERF: skip the clear-and-rebuild entirely when the data (and the
            // active theme, which selects the stroke color) is unchanged — the
            // poller only produces new sparkline samples when a turn finishes.
            string sig = _activeTheme + "|";
            if (points != null)
            {
                var sb = new System.Text.StringBuilder();
                for (int i = 0; i < points.Count; i++)
                {
                    sb.Append(points[i].ToString("F1", System.Globalization.CultureInfo.InvariantCulture));
                    sb.Append(';');
                }
                sig += sb.ToString();
            }
            if (sig == _lastSparklineSig) return;
            _lastSparklineSig = sig;

            _sparklineCanvas.Children.Clear();

            if (points == null || points.Count < 2) return;

            double max = 10.0;
            foreach (var p in points) if (p > max) max = p;

            double w = _sparklineCanvas.ActualWidth > 0 ? _sparklineCanvas.ActualWidth : 320;
            double h = 36;
            double step = w / (points.Count - 1);

            var polyline = new Polyline();
            Color strokeColor = Color.FromRgb(0, 113, 227);
            if (_activeTheme == "CyberpunkNeon" || _activeTheme == "anime") strokeColor = Color.FromRgb(0, 240, 255);
            else if (_activeTheme == "NordicClean") strokeColor = Color.FromRgb(16, 185, 129);
            else if (_activeTheme == "Newspaper") strokeColor = Color.FromRgb(153, 27, 27);
            else if (_activeTheme == "ObsidianPro" || _activeTheme == "obsidian") strokeColor = Color.FromRgb(56, 189, 248);

            polyline.Stroke = FrozenBrushCache.Get(strokeColor);
            polyline.StrokeThickness = 2.0;
            polyline.StrokeLineJoin = PenLineJoin.Round;

            for (int i = 0; i < points.Count; i++)
            {
                double x = i * step;
                double y = h - (points[i] / max * (h - 8.0)) - 4.0;
                polyline.Points.Add(new Point(x, y));

                if (i == points.Count - 1)
                {
                    var dot = new Ellipse();
                    dot.Width = 6;
                    dot.Height = 6;
                    dot.Fill = FrozenBrushCache.Get(250, 204, 21);
                    Canvas.SetLeft(dot, x - 3.0);
                    Canvas.SetTop(dot, y - 3.0);
                    _sparklineCanvas.Children.Add(dot);
                }
            }

            _sparklineCanvas.Children.Add(polyline);
        }
    }

    public class SettingsWindow : Window
    {
        private readonly MainWindow _mainWindow;
        private readonly UserSettings _settings;
        private readonly List<SessionItem> _sessions;

        private ComboBox _sessionCombo;
        private ComboBox _themeCombo;
        private Slider _opacitySlider;
        private TextBlock _opacityLabel;
        private ComboBox _intervalCombo;
        private CheckBox _chkAlwaysOnTop;

        private CheckBox _chkShowTps;
        private CheckBox _chkShowAvgTps;
        private CheckBox _chkShowSparkline;
        private CheckBox _chkShowDuration;
        private CheckBox _chkShowInputTokens;
        private CheckBox _chkShowOutputTokens;
        private CheckBox _chkShowReasoning;
        private CheckBox _chkShowCache;
        private CheckBox _chkShowCost;
        private CheckBox _chkShowSessionSummary;

        private CheckBox _chkCustomPricing;
        private TextBox _txtPriceIn;
        private TextBox _txtPriceOut;
        private TextBox _txtPriceCache;
        private TextBox _txtExchangeRate;

        private CheckBox _chkQuotaMode;
        private TextBox _txtTotalQuota;
        private ComboBox _comboQuotaCurrency;

        public SettingsWindow(MainWindow mainWindow, UserSettings settings, List<SessionItem> sessions)
        {
            _mainWindow = mainWindow;
            _settings = settings;
            _sessions = sessions != null ? sessions : new List<SessionItem>();

            InitializeSettingsUI();
        }

        private void InitializeSettingsUI()
        {
            this.Title = "ZCode-TPS-HUD 配置中心";
            AppIconProvider.ApplyToWindow(this);
            this.Width = 460;
            this.Height = 680;
            this.WindowStartupLocation = WindowStartupLocation.CenterScreen;
            this.WindowStyle = WindowStyle.None;
            this.AllowsTransparency = true;
            this.Background = Brushes.Transparent;

            var hostGrid = new Grid();
            hostGrid.Margin = new Thickness(10);
            hostGrid.Background = Brushes.Transparent;

            var bgCard = new Border();
            bgCard.CornerRadius = new CornerRadius(16);
            bgCard.Background = new SolidColorBrush(Color.FromArgb(248, 255, 255, 255));
            bgCard.BorderBrush = new SolidColorBrush(Color.FromRgb(210, 210, 215));
            bgCard.BorderThickness = new Thickness(1.2);
            bgCard.Padding = new Thickness(18);

            var shadow = new DropShadowEffect();
            shadow.Color = Colors.Black;
            shadow.BlurRadius = 20;
            shadow.ShadowDepth = 3;
            shadow.Opacity = 0.22;
            bgCard.Effect = shadow;

            bgCard.MouseLeftButtonDown += (s, e) =>
            {
                if (e.ButtonState == MouseButtonState.Pressed)
                    this.DragMove();
            };

            var scrollViewer = new ScrollViewer();
            scrollViewer.VerticalScrollBarVisibility = ScrollBarVisibility.Auto;
            var mainLayout = new StackPanel();

            var headerGrid = new Grid();
            headerGrid.Margin = new Thickness(0, 0, 0, 14);
            headerGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });
            headerGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = GridLength.Auto });

            var titleBlock = new TextBlock();
            titleBlock.Text = "⚙ ZCode-TPS-HUD 设置中心";
            titleBlock.FontSize = 16;
            titleBlock.FontWeight = FontWeights.Bold;
            titleBlock.Foreground = new SolidColorBrush(Color.FromRgb(29, 29, 31));
            Grid.SetColumn(titleBlock, 0);

            var btnClose = new Button();
            btnClose.Content = "✕";
            btnClose.Width = 28;
            btnClose.Height = 28;
            btnClose.Background = new SolidColorBrush(Color.FromArgb(25, 0, 0, 0));
            btnClose.Foreground = new SolidColorBrush(Color.FromRgb(81, 81, 84));
            btnClose.BorderThickness = new Thickness(0);
            btnClose.Cursor = Cursors.Hand;
            btnClose.FontWeight = FontWeights.Bold;
            btnClose.Click += (s, e) => this.Close();
            Grid.SetColumn(btnClose, 1);

            headerGrid.Children.Add(titleBlock);
            headerGrid.Children.Add(btnClose);
            mainLayout.Children.Add(headerGrid);

            // 1. Session Selector
            mainLayout.Children.Add(CreateFieldLabel("1. 目标监控会话 (支持多会话切换)"));
            _sessionCombo = new ComboBox();
            _sessionCombo.Margin = new Thickness(0, 4, 0, 12);
            _sessionCombo.Height = 30;

            var autoItem = new ComboBoxItem();
            autoItem.Content = "⚡ 自动追踪最新活跃会话 (Auto-Detect)";
            autoItem.Tag = "auto";
            _sessionCombo.Items.Add(autoItem);
            int selectedIdx = 0;

            for (int i = 0; i < _sessions.Count; i++)
            {
                var sess = _sessions[i];
                var item = new ComboBoxItem();
                string subId = sess.id.Length > 12 ? sess.id.Substring(0, 12) : sess.id;
                item.Content = string.Format("[{0}] {1}", subId, sess.title);
                item.Tag = sess.id;
                _sessionCombo.Items.Add(item);
                if (sess.id == _settings.selectedSessionId)
                {
                    selectedIdx = i + 1;
                }
            }
            _sessionCombo.SelectedIndex = selectedIdx;
            mainLayout.Children.Add(_sessionCombo);

            // 2. Theme Selector (6 Curated Themes)
            mainLayout.Children.Add(CreateFieldLabel("2. HUD 界面主题 (6 款高颜值主题)"));
            _themeCombo = new ComboBox();
            _themeCombo.Margin = new Thickness(0, 4, 0, 12);
            _themeCombo.Height = 30;

            var thm1 = new ComboBoxItem(); thm1.Content = "🍎 苹果风毛玻璃 (Apple Glass)"; thm1.Tag = "AppleGlass"; _themeCombo.Items.Add(thm1);
            var thm2 = new ComboBoxItem(); thm2.Content = "🌐 谷歌风 (Google Material 3)"; thm2.Tag = "GoogleMaterial"; _themeCombo.Items.Add(thm2);
            var thm3 = new ComboBoxItem(); thm3.Content = "⚡ 赛博霓虹 (Cyberpunk Neon)"; thm3.Tag = "CyberpunkNeon"; _themeCombo.Items.Add(thm3);
            var thm4 = new ComboBoxItem(); thm4.Content = "🌿 北欧极简 (Nordic Clean)"; thm4.Tag = "NordicClean"; _themeCombo.Items.Add(thm4);
            var thm5 = new ComboBoxItem(); thm5.Content = "📰 报纸复古风 (Vintage Editorial)"; thm5.Tag = "Newspaper"; _themeCombo.Items.Add(thm5);
            var thm6 = new ComboBoxItem(); thm6.Content = "🌌 黑曜石超清暗黑 (Obsidian Pro)"; thm6.Tag = "ObsidianPro"; _themeCombo.Items.Add(thm6);

            switch (_settings.theme)
            {
                case "GoogleMaterial": case "google": _themeCombo.SelectedIndex = 1; break;
                case "CyberpunkNeon": case "cyberpunk": case "AnimeCyber": case "anime": _themeCombo.SelectedIndex = 2; break;
                case "NordicClean": case "nordic": _themeCombo.SelectedIndex = 3; break;
                case "Newspaper": case "newspaper": _themeCombo.SelectedIndex = 4; break;
                case "ObsidianPro": case "obsidian": case "DarkGlass": _themeCombo.SelectedIndex = 5; break;
                default: _themeCombo.SelectedIndex = 0; break;
            }
            mainLayout.Children.Add(_themeCombo);

            // 3. Display Data Toggles
            mainLayout.Children.Add(CreateFieldLabel("3. 悬浮窗显示数据项开关 (独立自适应)"));
            var switchGrid = new Grid();
            switchGrid.Margin = new Thickness(0, 4, 0, 12);
            switchGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });
            switchGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });

            var col1 = new StackPanel();
            _chkShowTps = CreateCheckBox("⚡ 实时 TPS", _settings.showTps);
            _chkShowAvgTps = CreateCheckBox("📊 平均 TPS", _settings.showAvgTps);
            _chkShowSparkline = CreateCheckBox("📈 TPS 波动走势图", _settings.showSparkline);
            _chkShowDuration = CreateCheckBox("⏱️ 耗时与 TTFT", _settings.showDuration);
            _chkShowInputTokens = CreateCheckBox("📥 上下文输入 Token", _settings.showInputTokens);
            col1.Children.Add(_chkShowTps);
            col1.Children.Add(_chkShowAvgTps);
            col1.Children.Add(_chkShowSparkline);
            col1.Children.Add(_chkShowDuration);
            col1.Children.Add(_chkShowInputTokens);
            Grid.SetColumn(col1, 0);

            var col2 = new StackPanel();
            _chkShowOutputTokens = CreateCheckBox("📤 输出 Token", _settings.showOutputTokens);
            _chkShowReasoning = CreateCheckBox("🧠 思维链推理 Token", _settings.showReasoning);
            _chkShowCache = CreateCheckBox("⚡ 缓存命中率", _settings.showCache);
            _chkShowCost = CreateCheckBox("💰 单轮真实费用", _settings.showCost);
            _chkShowSessionSummary = CreateCheckBox("📋 会话全量累计统计", _settings.showSessionSummary);
            col2.Children.Add(_chkShowOutputTokens);
            col2.Children.Add(_chkShowReasoning);
            col2.Children.Add(_chkShowCache);
            col2.Children.Add(_chkShowCost);
            col2.Children.Add(_chkShowSessionSummary);
            Grid.SetColumn(col2, 1);

            switchGrid.Children.Add(col1);
            switchGrid.Children.Add(col2);
            mainLayout.Children.Add(switchGrid);

            // 4. Custom Pricing Box
            mainLayout.Children.Add(CreateFieldLabel("4. 自定义模型价格配置"));
            var priceCard = new Border();
            priceCard.CornerRadius = new CornerRadius(8);
            priceCard.Background = new SolidColorBrush(Color.FromArgb(20, 0, 0, 0));
            priceCard.BorderBrush = new SolidColorBrush(Color.FromArgb(30, 0, 0, 0));
            priceCard.BorderThickness = new Thickness(1);
            priceCard.Padding = new Thickness(10);
            priceCard.Margin = new Thickness(0, 4, 0, 12);

            var priceStack = new StackPanel();
            _chkCustomPricing = CreateCheckBox("启用自定义价格 (覆盖官方默认计费)", _settings.customPricing.enabled);
            priceStack.Children.Add(_chkCustomPricing);

            var presetWrap = new WrapPanel();
            presetWrap.Margin = new Thickness(0, 4, 0, 6);
            var btnPreOpenCodeDS = CreateSmallButton("🔥 OpenCode DeepSeek V4", (s, e) => SetPricing(0.22, 0.66, 0.022));
            var btnPreOpenCodeGLM = CreateSmallButton("OpenCode GLM-5.3", (s, e) => SetPricing(1.40, 4.40, 0.26));
            var btnPreOpenCodeKimi = CreateSmallButton("OpenCode Kimi K3", (s, e) => SetPricing(3.00, 15.00, 0.30));
            var btnPreOpenCodeMiMo = CreateSmallButton("OpenCode MiMo V2.5", (s, e) => SetPricing(0.14, 0.28, 0.0028));
            var btnPreOpenCodeHY = CreateSmallButton("OpenCode HY3", (s, e) => SetPricing(0.02, 0.07, 0.005));
            var btnPreGemini = CreateSmallButton("Gemini 3.7", (s, e) => SetPricing(0.15, 0.60, 0.0375));
            var btnPreClaude = CreateSmallButton("Claude 3.7", (s, e) => SetPricing(3.00, 15.00, 0.30));
            var btnPreDeepSeek = CreateSmallButton("DeepSeek R1", (s, e) => SetPricing(0.55, 2.19, 0.14));
            var btnPreGpt4 = CreateSmallButton("GPT-4o", (s, e) => SetPricing(2.50, 10.00, 1.25));
            
            presetWrap.Children.Add(btnPreOpenCodeDS);
            presetWrap.Children.Add(btnPreOpenCodeGLM);
            presetWrap.Children.Add(btnPreOpenCodeKimi);
            presetWrap.Children.Add(btnPreOpenCodeMiMo);
            presetWrap.Children.Add(btnPreOpenCodeHY);
            presetWrap.Children.Add(btnPreGemini);
            presetWrap.Children.Add(btnPreClaude);
            presetWrap.Children.Add(btnPreDeepSeek);
            presetWrap.Children.Add(btnPreGpt4);
            priceStack.Children.Add(presetWrap);

            var priceGrid = new Grid();
            priceGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });
            priceGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });
            priceGrid.RowDefinitions.Add(new RowDefinition() { Height = GridLength.Auto });
            priceGrid.RowDefinitions.Add(new RowDefinition() { Height = GridLength.Auto });

            _txtPriceIn = CreateInputRow(priceGrid, 0, 0, "输入价格 ($/1M):", _settings.customPricing.input.ToString("F4"));
            _txtPriceOut = CreateInputRow(priceGrid, 0, 1, "输出价格 ($/1M):", _settings.customPricing.output.ToString("F4"));
            _txtPriceCache = CreateInputRow(priceGrid, 1, 0, "缓存价格 ($/1M):", _settings.customPricing.cacheRead.ToString("F4"));
            _txtExchangeRate = CreateInputRow(priceGrid, 1, 1, "USD/CNY 汇率:", _settings.customPricing.usdToCny.ToString("F2"));
            priceStack.Children.Add(priceGrid);

            priceCard.Child = priceStack;
            mainLayout.Children.Add(priceCard);

            // 5. Quota Monitoring Box
            mainLayout.Children.Add(CreateFieldLabel("5. 自定义模型额度与自动监控"));
            var quotaCard = new Border();
            quotaCard.CornerRadius = new CornerRadius(8);
            quotaCard.Background = new SolidColorBrush(Color.FromArgb(20, 0, 0, 0));
            quotaCard.BorderBrush = new SolidColorBrush(Color.FromArgb(30, 0, 0, 0));
            quotaCard.BorderThickness = new Thickness(1);
            quotaCard.Padding = new Thickness(10);
            quotaCard.Margin = new Thickness(0, 4, 0, 12);

            var quotaStack = new StackPanel();
            _chkQuotaMode = CreateCheckBox("开启额度监控模式 (开启后显示剩余额度与告警进度条)", _settings.quotaSettings.enabled);
            quotaStack.Children.Add(_chkQuotaMode);

            var quotaRow = new Grid();
            quotaRow.Margin = new Thickness(0, 6, 0, 0);
            quotaRow.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });
            quotaRow.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });

            _txtTotalQuota = CreateInputRow(quotaRow, 0, 0, "总额度/初始额度:", _settings.quotaSettings.totalQuota.ToString("F2"));

            var qCurPnl = new StackPanel();
            qCurPnl.Margin = new Thickness(4, 2, 4, 2);
            var qCurLbl = new TextBlock();
            qCurLbl.Text = "额度结算币种:";
            qCurLbl.FontSize = 10;
            qCurLbl.Foreground = new SolidColorBrush(Color.FromRgb(134, 134, 139));
            _comboQuotaCurrency = new ComboBox();
            _comboQuotaCurrency.Height = 26;
            _comboQuotaCurrency.Margin = new Thickness(0, 2, 0, 0);
            var cur1 = new ComboBoxItem(); cur1.Content = "人民币 (CNY ¥)"; cur1.Tag = "CNY"; _comboQuotaCurrency.Items.Add(cur1);
            var cur2 = new ComboBoxItem(); cur2.Content = "美元 (USD $)"; cur2.Tag = "USD"; _comboQuotaCurrency.Items.Add(cur2);
            _comboQuotaCurrency.SelectedIndex = _settings.quotaSettings.currency == "USD" ? 1 : 0;
            qCurPnl.Children.Add(qCurLbl);
            qCurPnl.Children.Add(_comboQuotaCurrency);
            Grid.SetColumn(qCurPnl, 1);
            quotaRow.Children.Add(qCurPnl);

            quotaStack.Children.Add(quotaRow);
            quotaCard.Child = quotaStack;
            mainLayout.Children.Add(quotaCard);

            // 6. Opacity & Polling
            mainLayout.Children.Add(CreateFieldLabel("6. 窗口透明度与刷新"));
            var opGrid = new Grid();
            opGrid.Margin = new Thickness(0, 2, 0, 4);
            opGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });
            opGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = GridLength.Auto });
            _opacityLabel = new TextBlock();
            _opacityLabel.Text = string.Format("{0:F0}%", _settings.opacity * 100);
            _opacityLabel.Foreground = new SolidColorBrush(Color.FromRgb(0, 113, 227));
            _opacityLabel.FontWeight = FontWeights.Bold;
            Grid.SetColumn(_opacityLabel, 1);
            opGrid.Children.Add(_opacityLabel);
            mainLayout.Children.Add(opGrid);

            _opacitySlider = new Slider();
            _opacitySlider.Minimum = 0.3;
            _opacitySlider.Maximum = 1.0;
            _opacitySlider.Value = _settings.opacity;
            _opacitySlider.Margin = new Thickness(0, 0, 0, 10);
            _opacitySlider.SmallChange = 0.05;
            _opacitySlider.ValueChanged += (s, e) =>
            {
                if (_opacityLabel != null)
                    _opacityLabel.Text = string.Format("{0:F0}%", _opacitySlider.Value * 100);
            };
            mainLayout.Children.Add(_opacitySlider);

            var rowOther = new Grid();
            rowOther.Margin = new Thickness(0, 0, 0, 14);
            rowOther.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });
            rowOther.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(10) });
            rowOther.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });

            var pnlInterval = new StackPanel();
            pnlInterval.Children.Add(CreateFieldLabel("刷新频率 (Polling)"));
            _intervalCombo = new ComboBox();
            _intervalCombo.Height = 28;
            _intervalCombo.Margin = new Thickness(0, 3, 0, 0);

            var itv1 = new ComboBoxItem(); itv1.Content = "200ms (极速)"; itv1.Tag = 200; _intervalCombo.Items.Add(itv1);
            var itv2 = new ComboBoxItem(); itv2.Content = "500ms (平衡)"; itv2.Tag = 500; _intervalCombo.Items.Add(itv2);
            var itv3 = new ComboBoxItem(); itv3.Content = "1000ms (低耗)"; itv3.Tag = 1000; _intervalCombo.Items.Add(itv3);
            _intervalCombo.SelectedIndex = _settings.pollIntervalMs <= 200 ? 0 : (_settings.pollIntervalMs >= 1000 ? 2 : 1);
            pnlInterval.Children.Add(_intervalCombo);
            Grid.SetColumn(pnlInterval, 0);

            var pnlTop = new StackPanel();
            pnlTop.Children.Add(CreateFieldLabel("窗口置顶"));
            _chkAlwaysOnTop = CreateCheckBox("📌 悬浮窗始终置顶", _settings.alwaysOnTop);
            _chkAlwaysOnTop.Margin = new Thickness(0, 6, 0, 0);
            pnlTop.Children.Add(_chkAlwaysOnTop);
            Grid.SetColumn(pnlTop, 2);

            rowOther.Children.Add(pnlInterval);
            rowOther.Children.Add(pnlTop);
            mainLayout.Children.Add(rowOther);

            // 7. Action buttons
            var btnGrid = new Grid();
            btnGrid.Margin = new Thickness(0, 4, 0, 0);
            btnGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });
            btnGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(12) });
            btnGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });

            var btnSave = new Button();
            btnSave.Content = "✓ 保存并生效";
            btnSave.Height = 36;
            btnSave.Background = new SolidColorBrush(Color.FromRgb(0, 113, 227));
            btnSave.Foreground = Brushes.White;
            btnSave.FontWeight = FontWeights.Bold;
            btnSave.BorderThickness = new Thickness(0);
            btnSave.Cursor = Cursors.Hand;
            btnSave.Click += (s, e) => SaveAndApply();
            Grid.SetColumn(btnSave, 0);

            var btnCancel = new Button();
            btnCancel.Content = "取消";
            btnCancel.Height = 36;
            btnCancel.Background = new SolidColorBrush(Color.FromArgb(25, 0, 0, 0));
            btnCancel.Foreground = new SolidColorBrush(Color.FromRgb(29, 29, 31));
            btnCancel.BorderThickness = new Thickness(0);
            btnCancel.Cursor = Cursors.Hand;
            btnCancel.Click += (s, e) => this.Close();
            Grid.SetColumn(btnCancel, 2);

            btnGrid.Children.Add(btnSave);
            btnGrid.Children.Add(btnCancel);
            mainLayout.Children.Add(btnGrid);

            scrollViewer.Content = mainLayout;
            bgCard.Child = scrollViewer;
            hostGrid.Children.Add(bgCard);
            this.Content = hostGrid;
        }

        private void SetPricing(double inP, double outP, double cacheP)
        {
            _txtPriceIn.Text = inP.ToString("F4");
            _txtPriceOut.Text = outP.ToString("F4");
            _txtPriceCache.Text = cacheP.ToString("F4");
            _chkCustomPricing.IsChecked = true;
        }

        private Button CreateSmallButton(string title, RoutedEventHandler onClick)
        {
            var btn = new Button();
            btn.Content = title;
            btn.Padding = new Thickness(6, 2, 6, 2);
            btn.Margin = new Thickness(2);
            btn.FontSize = 10;
            btn.FontWeight = FontWeights.SemiBold;
            btn.Background = new SolidColorBrush(Color.FromArgb(25, 0, 0, 0));
            btn.Foreground = new SolidColorBrush(Color.FromRgb(29, 29, 31));
            btn.BorderThickness = new Thickness(0);
            btn.Cursor = Cursors.Hand;
            btn.Click += onClick;
            return btn;
        }

        private TextBox CreateInputRow(Grid parent, int row, int col, string label, string defVal)
        {
            var p = new StackPanel();
            p.Margin = new Thickness(4, 2, 4, 2);

            var lbl = new TextBlock();
            lbl.Text = label;
            lbl.FontSize = 10;
            lbl.Foreground = new SolidColorBrush(Color.FromRgb(134, 134, 139));

            var tb = new TextBox();
            tb.Text = defVal;
            tb.FontSize = 11;
            tb.FontWeight = FontWeights.Bold;
            tb.Height = 26;
            tb.Padding = new Thickness(4, 2, 4, 2);
            tb.Margin = new Thickness(0, 2, 0, 0);

            p.Children.Add(lbl);
            p.Children.Add(tb);

            Grid.SetRow(p, row);
            Grid.SetColumn(p, col);
            parent.Children.Add(p);
            return tb;
        }

        private TextBlock CreateFieldLabel(string text)
        {
            var tb = new TextBlock();
            tb.Text = text;
            tb.FontSize = 11;
            tb.FontWeight = FontWeights.Bold;
            tb.Foreground = new SolidColorBrush(Color.FromRgb(81, 81, 84));
            return tb;
        }

        private CheckBox CreateCheckBox(string text, bool isChecked)
        {
            var cb = new CheckBox();
            cb.Content = text;
            cb.IsChecked = isChecked;
            cb.Margin = new Thickness(0, 3, 0, 3);
            cb.FontSize = 11;
            cb.Foreground = new SolidColorBrush(Color.FromRgb(29, 29, 31));
            return cb;
        }

        private static double ParseInvariant(string text, double fallback)
        {
            if (string.IsNullOrEmpty(text)) return fallback;
            double v;
            string normalized = text.Trim().Replace(',', '.');
            if (double.TryParse(normalized, System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture, out v))
            {
                return v;
            }
            return fallback;
        }

        private void SaveAndApply()
        {
            if (_sessionCombo.SelectedItem is ComboBoxItem)
            {
                var sessItem = (ComboBoxItem)_sessionCombo.SelectedItem;
                if (sessItem.Tag != null)
                {
                    _settings.selectedSessionId = sessItem.Tag.ToString();
                }
            }

            if (_themeCombo.SelectedItem is ComboBoxItem)
            {
                var themeItem = (ComboBoxItem)_themeCombo.SelectedItem;
                if (themeItem.Tag != null)
                {
                    _settings.theme = themeItem.Tag.ToString();
                }
            }

            _settings.opacity = _opacitySlider.Value;

            if (_intervalCombo.SelectedItem is ComboBoxItem)
            {
                var intItem = (ComboBoxItem)_intervalCombo.SelectedItem;
                if (intItem.Tag is int)
                {
                    _settings.pollIntervalMs = (int)intItem.Tag;
                }
            }

            _settings.alwaysOnTop = _chkAlwaysOnTop.IsChecked.HasValue && _chkAlwaysOnTop.IsChecked.Value;

            _settings.showTps = _chkShowTps.IsChecked.HasValue && _chkShowTps.IsChecked.Value;
            _settings.showAvgTps = _chkShowAvgTps.IsChecked.HasValue && _chkShowAvgTps.IsChecked.Value;
            _settings.showSparkline = _chkShowSparkline.IsChecked.HasValue && _chkShowSparkline.IsChecked.Value;
            _settings.showDuration = _chkShowDuration.IsChecked.HasValue && _chkShowDuration.IsChecked.Value;
            _settings.showInputTokens = _chkShowInputTokens.IsChecked.HasValue && _chkShowInputTokens.IsChecked.Value;
            _settings.showOutputTokens = _chkShowOutputTokens.IsChecked.HasValue && _chkShowOutputTokens.IsChecked.Value;
            _settings.showReasoning = _chkShowReasoning.IsChecked.HasValue && _chkShowReasoning.IsChecked.Value;
            _settings.showCache = _chkShowCache.IsChecked.HasValue && _chkShowCache.IsChecked.Value;
            _settings.showCost = _chkShowCost.IsChecked.HasValue && _chkShowCost.IsChecked.Value;
            _settings.showSessionSummary = _chkShowSessionSummary.IsChecked.HasValue && _chkShowSessionSummary.IsChecked.Value;

            _settings.customPricing.enabled = _chkCustomPricing.IsChecked.HasValue && _chkCustomPricing.IsChecked.Value;
            // Parse numeric input with invariant culture (the previous
            // culture-sensitive TryParse mis-read "0.15" on locales whose
            // decimal separator is a comma, silently turning prices into 0)
            // and keep the previous value when the text is not a valid number.
            _settings.customPricing.input = ParseInvariant(_txtPriceIn.Text, _settings.customPricing.input);
            _settings.customPricing.output = ParseInvariant(_txtPriceOut.Text, _settings.customPricing.output);
            _settings.customPricing.cacheRead = ParseInvariant(_txtPriceCache.Text, _settings.customPricing.cacheRead);
            _settings.customPricing.usdToCny = ParseInvariant(_txtExchangeRate.Text, _settings.customPricing.usdToCny);

            _settings.quotaSettings.enabled = _chkQuotaMode.IsChecked.HasValue && _chkQuotaMode.IsChecked.Value;
            _settings.quotaSettings.totalQuota = ParseInvariant(_txtTotalQuota.Text, _settings.quotaSettings.totalQuota);
            var curItem = _comboQuotaCurrency.SelectedItem as ComboBoxItem;
            if (curItem != null && curItem.Tag != null)
            {
                _settings.quotaSettings.currency = curItem.Tag.ToString();
            }

            _mainWindow.SaveSettings();
            _mainWindow.ApplyThemeAndSettings();

            this.Close();
        }
    }
}
