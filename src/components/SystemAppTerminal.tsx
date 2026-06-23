/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ThemeConfig, AppMetadata, ThemeId } from '../types';
import { playAsmrClick, playAsmrTick } from './SoundEngine';
import { THEMES } from './ThemeConfig';
import { Terminal as TerminalIcon, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SystemAppTerminalProps {
  theme: ThemeConfig;
  username: string;
  onThemeChange: (id: ThemeId) => void;
  installedApps: AppMetadata[];
  onInstallApp: (app: AppMetadata) => void;
  onUninstallApp: (id: string) => void;
}

interface CommandHistory {
  command: string;
  output: React.ReactNode;
}

const BASH_HELP_MAP: Record<string, string> = {
  cd: `cd: cd [-L|[-P [-e]] [-@]] [dir]
    Change the shell working directory.

    Change the current directory to DIR.  The default DIR is the value of the
    HOME shell variable.

    Options:
      -L\tforce symbolic links to be followed: resolve symbolic links in
      \tDIR after processing instances of \`..'
      -P\tuse the physical directory structure without following symbolic
      \tlinks: resolve symbolic links in DIR before processing instances
      \tof \`..'
      -e\tif the -P option is supplied, and the current working directory
      \tcannot be determined successfully, exit with a non-zero status

    Exit Status:
    Returns 0 if the directory is changed; non-zero otherwise.`,
  alias: `alias: alias [-p] [name[=value] ... ]
    Define or display aliases.

    Without arguments, \`alias' prints the list of aliases in the form
    \`alias name=value' on standard output.

    Otherwise, an alias is defined for each NAME whose VALUE is given.
    A trailing space in VALUE causes the next word to be checked for
    alias substitution when the alias is expanded.

    Options:
      -p\tprint all defined aliases in a reusable format

    Exit Status:
    alias returns true unless a NAME is supplied for which no alias has been
    defined.`,
  unalias: `unalias: unalias [-a] name [name ...]
    Remove each NAME from the list of defined aliases.

    Options:
      -a\tremove all alias definitions

    Exit Status:
    Return success unless a NAME is not an existing alias.`,
  export: `export: export [-fn] [name[=value] ...] or export -p
    Set export attribute for shell variables.

    Marks each NAME for automatic export to the environment of subsequently
    executed commands.  If VALUE is supplied, assign VALUE before exporting.

    Options:
      -f\trefer to shell functions
      -n\tremove the export property from each NAME
      -p\tprint a list of all exported variables and functions

    Exit Status:
    Returns success unless an invalid option is given or NAME is invalid.`,
  pwd: `pwd: pwd [-LP]
    Print the name of the current working directory.

    Options:
      -L\tprint the value of $PWD if it names the current working directory
      -P\tprint the physical directory, without any symbolic links

    Exit Status:
    Returns 0 unless an invalid option is given or the current directory cannot
    be read.`,
  echo: `echo: echo [-neE] [arg ...]
    Write arguments to the standard output.

    Display the ARGs, separated by a single space character and a newline, on
    the standard output.

    Options:
      -n\tdo not append a newline
      -e\tenable interpretation of the following backslash-escaped characters
      -E\texplicitly suppress interpretation of backslash-escaped characters

    Exit Status:
    Returns success unless a write error occurs.`,
  history: `history: history [-c] [-d offset] [n] or history -anrw [filename]
    Display or manipulate the history list.

    Display the history list with line numbers, prefixing each entry with a
    \`*' if it has been modified.

    Exit Status:
    Returns success unless an invalid option is given or an error occurs.`,
  exit: `exit: exit [n]
    Exit the shell.

    Exits the shell with a status of N.  If N is omitted, the exit status
    is that of the last command executed.`,
  logout: `logout: logout [n]
    Exit a login shell.

    Exits a login shell with status N.  If N is omitted, the exit status
    is that of the last command executed.`,
  source: `source: source filename [arguments]
    Execute commands from a file in the current shell.

    Read and execute commands from FILENAME in the current shell.  The
    entries in $PATH are used to find the directory containing FILENAME.

    Exit Status:
    Returns the status of the last command executed in FILENAME.`,
  '.': `source: source filename [arguments]
    Execute commands from a file in the current shell.

    Read and execute commands from FILENAME in the current shell.  The
    entries in $PATH are used to find the directory containing FILENAME.

    Exit Status:
    Returns the status of the last command executed in FILENAME.`
};

export default function SystemAppTerminal({
  theme,
  username,
  onThemeChange,
  installedApps,
  onInstallApp,
  onUninstallApp
}: SystemAppTerminalProps) {
  const [booting, setBooting] = useState(true);
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');
  const [history, setHistory] = useState<CommandHistory[]>([]);
  const [cmdIndex, setCmdIndex] = useState(-1);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [isMatrixMode, setIsMatrixMode] = useState(false);

  // GNU Bash Environment States
  const [currentDir, setCurrentDir] = useState<string>('/home/' + username + '/desktop');
  const [envVars, setEnvVars] = useState<Record<string, string>>({
    PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    SHELL: '/bin/bash',
    TERM: 'xterm-256color',
    USER: username,
    HOME: '/home/' + username,
    LANG: 'en_US.UTF-8',
    LOGNAME: username,
    PWD: '/home/' + username + '/desktop'
  });
  const [aliases, setAliases] = useState<Record<string, string>>({
    ll: 'ls -la',
    la: 'ls -a',
    alert: 'echo "system alert!"'
  });

  // Additional state for real GNU Bash command emulation
  const [dirStack, setDirStack] = useState<string[]>([]);
  const [jobsList, setJobsList] = useState<{ id: number; command: string; status: string }[]>([
    { id: 1, command: 'lofi-ambient-daemon &', status: 'Running' }
  ]);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper: Expand environment variables
  const expandEnvVars = (str: string) => {
    return str.replace(/\$(\w+)/g, (match, p1) => {
      return envVars[p1] || '';
    });
  };

  // Helper: Get responsive relative prompt path
  const getPromptPath = (dir: string) => {
    const home = `/home/${username}`;
    if (dir === home) return '~';
    if (dir.startsWith(home)) {
      return '~' + dir.slice(home.length);
    }
    return dir;
  };

  // Boot sequence simulation
  useEffect(() => {
    const lines = [
      'GNU bash, version 5.2.21(1)-release (x86_64-pc-linux-gnu)',
      'These shell commands are defined internally. Type `help\' to see this list.',
      'Type `help name\' to find out more about the function `name\'.',
      'Use `info bash\' to find out more about the shell in general.',
      'Use `man -k\' or `info\' to find out more about commands not in this list.',
      '',
      `Welcome to landala-pc (Ubuntu 24.04 LTS) running Linux kernel 6.8.0-31-generic`,
      `* Documentation:  https://help.ubuntu.com`,
      `* Management:     https://landscape.canonical.com`,
      `* Support:        https://ubuntu.com/pro`,
      '',
      `Last login: ${new Date(Date.now() - 3600000).toUTCString()} on tty1`,
      ''
    ];

    let count = 0;
    const interval = setInterval(() => {
      if (count < lines.length) {
        setBootLines(prev => [...prev, lines[count]]);
        count++;
      } else {
        clearInterval(interval);
        setBooting(false);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [username]);

  // Scroll to bottom whenever history increases or keyboard events fire
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [history, bootLines, booting, isMatrixMode]);

  const handleTerminalClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const executeCommand = (fullCmd: string) => {
    const trimmed = fullCmd.trim();
    if (!trimmed) return;

    // Save history
    setInputHistory(prev => [trimmed, ...prev]);
    setCmdIndex(-1);

    // Alias Resolution
    let inputToExec = trimmed;
    const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
    if (aliases[firstWord]) {
      const aliasReplacement = aliases[firstWord];
      const remainingText = trimmed.substring(firstWord.length);
      inputToExec = aliasReplacement + remainingText;
    }

    const parts = inputToExec.split(/\s+/);
    let cmd = parts[0].toLowerCase();
    let args = parts.slice(1);
    let isSudo = false;

    if (cmd === 'sudo') {
      isSudo = true;
      if (parts.length > 1) {
        cmd = parts[1].toLowerCase();
        args = parts.slice(2);
      }
    }

    let outputElement: React.ReactNode = null;

    switch (cmd) {
      case 'help': {
        const helpTopic = args[0]?.toLowerCase();
        if (helpTopic && BASH_HELP_MAP[helpTopic]) {
          outputElement = (
            <div className="text-stone-300 font-mono text-xs whitespace-pre-wrap leading-relaxed select-text overflow-x-auto">
              {BASH_HELP_MAP[helpTopic]}
            </div>
          );
        } else if (helpTopic) {
          outputElement = (
            <div className="text-red-400 font-mono text-xs select-text">
              bash: help: no help topics match `{helpTopic}`.  Try 'help' alone for internal command overview.
            </div>
          );
        } else {
          outputElement = (
            <div className="text-stone-300 font-mono text-xs whitespace-pre leading-relaxed select-text overflow-x-auto">
{`GNU bash, version 5.2.21(1)-release (x86_64-pc-linux-gnu)
These shell commands are defined internally.  Type \`help' to see this list.
Type \`help name' to find out more about the function \`name'.
Use \`info bash' to find out more about the shell in general.
Use \`man -k' or \`info' to find out more about commands not in this list.

A star (*) next to a name means that the command is disabled.

 job_spec [&]                            history [-c] [-d offset] [n] or hist>
 (( expression ))                        if COMMANDS; then COMMANDS; [ elif C>
 . filename [arguments]                  jobs [-lnprs] [jobspec ...] or jobs >
 :                                       kill [-s sigspec | -n signum | -sigs>
 [ arg... ]                              let arg [arg ...]
 [[ expression ]]                        local [option] name[=value] ...
 alias [-p] [name[=value] ... ]          logout [n]
 bg [job_spec ...]                       mapfile [-d delim] [-n count] [-O or>
 bind [-lpsvPSVX] [-m keymap] [-f file>  popd [-n] [+N | -N]
 break [n]                               printf [-v var] format [arguments]
 builtin [shell-builtin [arg ...]]       pushd [-n] [+N | -N | dir]
 caller [expr]                           pwd [-LP]
 case WORD in [PATTERN [| PATTERN]...)>  read [-ers] [-a array] [-d delim] [->
 cd [-L|[-P [-e]] [-@]] [dir]            readarray [-d delim] [-n count] [-O >
 command [-pVv] command [arg ...]        readonly [-aAf] [name[=value] ...] o>
 compgen [-abcdefgjksuv] [-o option] [>  return [n]
 complete [-abcdefgjksuv] [-pr] [-DEI]>  select NAME [in WORDS ... ;] do COMM>
 compopt [-o|+o option] [-DEI] [name .>  set [-abefhkmnptuvxBCEHPT] [-o optio>
 continue [n]                            shift [n]
 coproc [NAME] command [redirections]    shopt [-pqsu] [-o] [optname ...]
 declare [-aAfFgiIlnrtux] [name[=value>  source filename [arguments]
 dirs [-clpv] [+N] [-N]                  suspend [-f]
 disown [-h] [-ar] [jobspec ... | pid >  test [expr]
 echo [-neE] [arg ...]                   time [-p] pipeline
 enable [-a] [-dnps] [-f filename] [na>  times
 eval [arg ...]                          trap [-lp] [[arg] signal_spec ...]
 exec [-cl] [-a name] [command [argume>  true
 exit [n]                                type [-afptP] name [name ...]
 export [-fn] [name[=value] ...] or ex>  typeset [-aAfFgiIlnrtux] name[=value>
 false                                   ulimit [-SHabcdefiklmnpqrstuvxPRT] [>
 fc [-e ename] [-lnr] [first] [last] o>  umask [-p] [-S] [mode]
 fg [job_spec]                           unalias [-a] name [name ...]
 for NAME [in WORDS ... ] ; do COMMAND>  unset [-f] [-v] [-n] [name ...]
 for (( exp1; exp2; exp3 )); do COMMAN>  until COMMANDS; do COMMANDS-2; done
 function name { COMMANDS ; } or name >  variables - Names and meanings of so>
 getopts optstring name [arg ...]        wait [-fn] [-p var] [id ...]
 hash [-lr] [-p pathname] [-dt] [name >  while COMMANDS; do COMMANDS-2; done
 help [-dms] [pattern ...]               { COMMANDS ; }`}

            <div className="mt-4 pt-2 border-t border-stone-800 space-y-1">
              <span className="text-amber-400 font-bold block">💡 Extra Landala PC Terminal Utilities:</span>
              <div><span className="text-green-400 font-semibold inline-block w-24">neofetch</span> - Show core system configurations & ASCII art</div>
              <div><span className="text-green-400 font-semibold inline-block w-24 font-mono">ls</span> - List files in current directory & desktop apps (supports -l, -a, -la)</div>
              <div><span className="text-green-400 font-semibold inline-block w-24 font-mono">touch [file]</span> - Create a blank virtual file in desktop</div>
              <div><span className="text-green-400 font-semibold inline-block w-24 font-mono">mkdir [dir]</span> - Simulated folder creation</div>
              <div><span className="text-green-400 font-semibold inline-block w-24 font-mono">cat [file]</span> - Print virtual file content (supports redirection with &gt; or &gt;&gt;)</div>
              <div><span className="text-green-400 font-semibold inline-block w-24 font-mono">echo [args]</span> - Prints variables (e.g. echo $USER) or writes files to disk</div>
              <div><span className="text-green-400 font-semibold inline-block w-24 font-mono">rm [file/app]</span> - Delete a virtual file or uninstall a desktop app</div>
              <div><span className="text-green-400 font-semibold inline-block w-24 font-mono">export key=val</span> - Write environment variable values</div>
              <div><span className="text-green-400 font-semibold inline-block w-24 font-mono">env</span> - Print current terminal environment states</div>
              <div><span className="text-green-400 font-semibold inline-block w-24 font-mono">theme [id]</span> - List or switch active operating system themes</div>
              <div><span className="text-green-400 font-semibold inline-block w-24 font-mono">install [app]</span> - Pin / Install game app (e.g. game-boing)</div>
              <div><span className="text-green-400 font-semibold inline-block w-24 font-mono">cmatrix</span> - Matrix style green terminal screensaver</div>
              <div><span className="text-green-400 font-semibold inline-block w-24 font-mono">ping [host]</span> - Test roundtrip connection latency simulation</div>
              <div><span className="text-green-400 font-semibold inline-block w-24 font-mono">clear</span> - Clear output terminal history buffer</div>
            </div>
          </div>
        );
        }
        break;
      }
      case 'clear': {
        setHistory([]);
        return;
      }
      case 'whoami': {
        outputElement = (
          <div className="text-emerald-400 font-mono text-xs">
            {username}
          </div>
        );
        break;
      }
      case 'pwd': {
        outputElement = (
          <div className="text-stone-300 font-mono text-xs">
            {currentDir}
          </div>
        );
        break;
      }
      case 'date': {
        outputElement = (
          <div className="text-stone-300 font-mono text-xs">
            {new Date().toString()}
          </div>
        );
        break;
      }
      case 'uname': {
        outputElement = (
          <div className="text-stone-300 font-mono text-xs">
            Linux landala-pc 6.8.0-31-generic #31-Ubuntu SMP PREEMPT_DYNAMIC Thu Apr 11 12:01:21 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux
          </div>
        );
        break;
      }
      case 'uptime': {
        outputElement = (
          <div className="text-stone-300 font-mono text-xs">
            {new Date().toLocaleTimeString()} up 1:42, 1 user, load average: 0.05, 0.08, 0.12
          </div>
        );
        break;
      }
      case 'cmatrix': {
        setIsMatrixMode(true);
        return;
      }
      case 'ping': {
        if (args.length === 0) {
          outputElement = <span className="text-stone-300">ping: missing host operand</span>;
        } else {
          const host = args[0];
          outputElement = (
            <div className="font-mono text-xs whitespace-pre text-stone-305 leading-normal select-text">
{`PING ${host} (${host === 'google.com' || host === '8.8.8.8' ? '8.8.8.8' : '127.0.0.1'}) 56(84) bytes of data.
64 bytes from ${host}: icmp_seq=1 ttl=64 time=12.4 ms
64 bytes from ${host}: icmp_seq=2 ttl=64 time=15.1 ms
64 bytes from ${host}: icmp_seq=3 ttl=64 time=10.9 ms
64 bytes from ${host}: icmp_seq=4 ttl=64 time=13.2 ms

--- ${host} ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3004ms
rtt min/avg/max/mdev = 10.912/12.934/15.144/1.523 ms`}
            </div>
          );
        }
        break;
      }
      case 'touch': {
        if (args.length === 0) {
          outputElement = <span className="text-red-400 font-mono text-xs">touch: missing file operand</span>;
        } else {
          const targetFile = args[0];
          const userKey = `landala_virtual_files_${username}`;
          let filesData = localStorage.getItem(userKey) || '[]';
          let virtualFilesList: any[] = [];
          try { virtualFilesList = JSON.parse(filesData); } catch (e) {}

          const existing = virtualFilesList.find(f => f.name.toLowerCase() === targetFile.toLowerCase());
          if (!existing) {
            virtualFilesList.push({
              id: `file_${Date.now()}`,
              name: targetFile,
              content: ''
            });
            localStorage.setItem(userKey, JSON.stringify(virtualFilesList));
          }
          outputElement = null;
        }
        break;
      }
      case 'mkdir': {
        if (args.length === 0) {
          outputElement = <span className="text-red-400 font-mono text-xs">mkdir: missing operand</span>;
        } else {
          outputElement = <span className="text-stone-400 font-mono text-xs">mkdir: created directory '{args[0]}'</span>;
        }
        break;
      }
      case 'alias': {
        if (args.length === 0) {
          outputElement = (
            <div className="space-y-0.5 text-stone-300 font-mono text-xs select-text">
              {Object.entries(aliases).map(([key, val]) => (
                <div key={key}>alias {key}='{val}'</div>
              ))}
            </div>
          );
        } else {
          const aliasStr = args.join(' ');
          const eqIdx = aliasStr.indexOf('=');
          if (eqIdx !== -1) {
            const key = aliasStr.substring(0, eqIdx).trim();
            let val = aliasStr.substring(eqIdx + 1).trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);

            setAliases(prev => ({
              ...prev,
              [key]: val
            }));
            outputElement = null;
          } else {
            const key = aliasStr.trim();
            if (aliases[key]) {
              outputElement = <div className="text-stone-300 font-mono text-xs">alias {key}='{aliases[key]}'</div>;
            } else {
              outputElement = <div className="text-red-400 font-mono text-xs">bash: alias: {key}: not found</div>;
            }
          }
        }
        break;
      }
      case 'unalias': {
        if (args.length === 0) {
          outputElement = <span className="text-red-400 font-mono text-xs">unalias: usage: unalias [-a] name [name ...]</span>;
        } else {
          const name = args[0];
          if (aliases[name]) {
            setAliases(prev => {
              const copy = { ...prev };
              delete copy[name];
              return copy;
            });
            outputElement = null;
          } else {
            outputElement = <span className="text-red-405 font-mono text-xs">bash: unalias: {name}: not found</span>;
          }
        }
        break;
      }
      case 'export': {
        if (args.length === 0) {
          outputElement = (
            <div className="space-y-0.5 text-stone-300 font-mono text-xs select-text">
              {Object.entries(envVars).map(([key, val]) => (
                <div key={key}>declare -x {key}="{val}"</div>
              ))}
            </div>
          );
        } else {
          const exportStr = args.join(' ');
          const eqIdx = exportStr.indexOf('=');
          if (eqIdx !== -1) {
            const key = exportStr.substring(0, eqIdx).trim();
            let val = exportStr.substring(eqIdx + 1).trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);

            setEnvVars(prev => ({
              ...prev,
              [key]: expandEnvVars(val)
            }));
            outputElement = null;
          } else {
            outputElement = null;
          }
        }
        break;
      }
      case 'env': {
        outputElement = (
          <div className="space-y-0.5 text-stone-300 font-mono text-xs select-text">
            {Object.entries(envVars).map(([key, val]) => (
              <div key={key}>{key}={val}</div>
            ))}
          </div>
        );
        break;
      }
      case 'echo': {
        const redirectIndex = args.indexOf('>');
        const appendIndex = args.indexOf('>>');

        if (redirectIndex !== -1 || appendIndex !== -1) {
          const isAppend = appendIndex !== -1;
          const idx = isAppend ? appendIndex : redirectIndex;
          const targetFile = args.slice(idx + 1).join(' ').trim();
          let writeContent = args.slice(0, idx).join(' ');

          if (writeContent.startsWith('"') && writeContent.endsWith('"')) {
            writeContent = writeContent.slice(1, -1);
          } else if (writeContent.startsWith("'") && writeContent.endsWith("'")) {
            writeContent = writeContent.slice(1, -1);
          }

          writeContent = expandEnvVars(writeContent);

          if (!targetFile) {
            outputElement = <span className="text-red-400 font-mono text-xs">bash: syntax error near unexpected token `newline'</span>;
          } else {
            const userKey = `landala_virtual_files_${username}`;
            let filesData = localStorage.getItem(userKey) || '[]';
            let virtualFilesList: any[] = [];
            try { virtualFilesList = JSON.parse(filesData); } catch (e) {}

            const existingIdx = virtualFilesList.findIndex(f => f.name.toLowerCase() === targetFile.toLowerCase());
            if (existingIdx !== -1) {
              if (isAppend) {
                virtualFilesList[existingIdx].content = (virtualFilesList[existingIdx].content || '') + '\n' + writeContent;
              } else {
                virtualFilesList[existingIdx].content = writeContent;
              }
            } else {
              virtualFilesList.push({
                id: `file_${Date.now()}`,
                name: targetFile,
                content: writeContent
              });
            }
            localStorage.setItem(userKey, JSON.stringify(virtualFilesList));
            outputElement = null; 
          }
        } else {
          let content = args.join(' ');
          if (content.startsWith('"') && content.endsWith('"')) {
            content = content.slice(1, -1);
          } else if (content.startsWith("'") && content.endsWith("'")) {
            content = content.slice(1, -1);
          }
          outputElement = <div className="text-stone-300 font-mono text-xs">{expandEnvVars(content)}</div>;
        }
        break;
      }
      case 'cd': {
        const target = args[0] || '~';
        let newDir = currentDir;

        if (target === '~') {
          newDir = `/home/${username}`;
        } else if (target === '..') {
          if (currentDir === `/home/${username}/desktop`) {
            newDir = `/home/${username}`;
          } else if (currentDir === `/home/${username}`) {
            newDir = '/home';
          } else if (currentDir === '/home') {
            newDir = '/';
          }
        } else if (target === '/') {
          newDir = '/';
        } else {
          const cleanTarget = target.replace(/^\//, '');
          if (currentDir === '/' && cleanTarget === 'home') {
            newDir = '/home';
          } else if (currentDir === '/home' && cleanTarget === username) {
            newDir = `/home/${username}`;
          } else if (currentDir === `/home/${username}` && cleanTarget === 'desktop') {
            newDir = `/home/${username}/desktop`;
          } else if (cleanTarget === 'desktop') {
            newDir = `/home/${username}/desktop`;
          } else {
            outputElement = <span className="text-red-400 font-mono text-xs">bash: cd: {target}: No such file or directory</span>;
            break;
          }
        }

        setCurrentDir(newDir);
        setEnvVars(prev => ({ ...prev, PWD: newDir }));
        outputElement = null;
        break;
      }
      case 'history': {
        outputElement = (
          <div className="text-stone-400 space-y-0.5 max-h-[160px] overflow-y-auto select-text font-mono text-xs">
            {inputHistory.slice().reverse().map((cmdStr, index) => (
              <div key={index}>
                <span className="text-stone-600 inline-block w-8 select-none">{index + 1}</span> {cmdStr}
              </div>
            ))}
          </div>
        );
        break;
      }
      case '[`':
      case '[':
      case '[[':
      case 'test': {
        // Strip trailing bracket characters if present for '[' / '[[' syntaxes
        let testArgs = [...args];
        if (cmd === '[' && testArgs[testArgs.length - 1] === ']') {
          testArgs.pop();
        } else if (cmd === '[[' && testArgs[testArgs.length - 1] === ']]') {
          testArgs.pop();
        }
        
        let success = true;
        if (testArgs.length === 0) {
          success = false;
        } else if (testArgs[0] === '-f' || testArgs[0] === '-e') {
          const filename = testArgs[1];
          const userKey = `landala_virtual_files_${username}`;
          let filesData = localStorage.getItem(userKey);
          if (!filesData && username === 'fossguru') {
            filesData = localStorage.getItem('landala_virtual_files');
          }
          let list: any[] = [];
          if (filesData) {
            try { list = JSON.parse(filesData); } catch (e) {}
          }
          success = list.some(f => f.name.toLowerCase() === filename?.toLowerCase());
        } else if (testArgs[0] === '-d') {
          const checkDir = testArgs[1];
          success = checkDir === 'desktop' || checkDir === 'desktop/' || checkDir === '/home' || checkDir?.includes('/');
        } else if (testArgs[1] === '=' || testArgs[1] === '==') {
          const val1 = expandEnvVars(testArgs[0]);
          const val2 = expandEnvVars(testArgs[2]);
          success = val1 === val2;
        } else if (testArgs[1] === '!=') {
          const val1 = expandEnvVars(testArgs[0]);
          const val2 = expandEnvVars(testArgs[2]);
          success = val1 !== val2;
        }

        setEnvVars(prev => ({ ...prev, '?': success ? '0' : '1' }));
        outputElement = null;
        break;
      }
      case 'true': {
        setEnvVars(prev => ({ ...prev, '?': '0' }));
        outputElement = null;
        break;
      }
      case 'false': {
        setEnvVars(prev => ({ ...prev, '?': '1' }));
        outputElement = null;
        break;
      }
      case '((':
      case 'let': {
        const expression = args.join(' ').replace(/\(|\)/g, '').trim();
        const eqIdx = expression.indexOf('=');
        if (eqIdx !== -1) {
          const targetVar = expression.substring(0, eqIdx).trim();
          let rhs = expression.substring(eqIdx + 1).trim();
          rhs = expandEnvVars(rhs);
          if (/^[0-9+\-*/%()\s]+$/.test(rhs)) {
            try {
              const result = Function(`"use strict"; return (${rhs})`)();
              setEnvVars(prev => ({
                ...prev,
                [targetVar]: String(result),
                '?': '0'
              }));
              outputElement = null;
            } catch (e) {
              outputElement = <span className="text-red-400 font-mono text-xs">bash: let: {rhs}: arithmetic syntax error</span>;
              setEnvVars(prev => ({ ...prev, '?': '1' }));
            }
          } else {
            outputElement = <span className="text-red-400 font-mono text-xs">bash: let: invalid arithmetic expression</span>;
            setEnvVars(prev => ({ ...prev, '?': '1' }));
          }
        } else {
          const rhs = expandEnvVars(expression);
          if (/^[0-9+\-*/%()\s]+$/.test(rhs)) {
            try {
              const result = Function(`"use strict"; return (${rhs})`)();
              const ok = Number(result) !== 0;
              setEnvVars(prev => ({ ...prev, '?': ok ? '0' : '1' }));
              outputElement = null;
            } catch (e) {
              setEnvVars(prev => ({ ...prev, '?': '1' }));
            }
          }
        }
        break;
      }
      case 'jobs': {
        const flag = args[0];
        outputElement = (
          <div className="space-y-0.5 text-stone-300 font-mono text-xs select-text">
            {jobsList.map(j => (
              <div key={j.id}>
                [{j.id}]+  {flag === '-l' ? `${10382 + j.id} ` : ''}{j.status}                 {j.command}
              </div>
            ))}
          </div>
        );
        break;
      }
      case 'bg': {
        const target = args[0] || '%1';
        const num = parseInt(target.replace('%', '')) || 1;
        setJobsList(prev => prev.map(j => j.id === num ? { ...j, status: 'Running' } : j));
        outputElement = <div className="text-stone-300 font-mono text-xs">[{num}]+ Running &</div>;
        break;
      }
      case 'fg': {
        const target = args[0] || '%1';
        const num = parseInt(target.replace('%', '')) || 1;
        const found = jobsList.find(j => j.id === num);
        if (found) {
          outputElement = (
            <div className="text-stone-300 font-mono text-xs">
              <div>{found.command.replace(' &', '')}</div>
              <div className="text-stone-500 italic mt-1">[Wait for keystroke... press Ctrl+Z to suspend back]</div>
            </div>
          );
        } else {
          outputElement = <div className="text-red-400 font-mono text-xs">bash: fg: no such job</div>;
        }
        break;
      }
      case 'suspend': {
        outputElement = <span className="text-red-400 font-mono text-xs">bash: suspend: cannot suspend a login shell</span>;
        break;
      }
      case 'disown': {
        if (args.includes('-a') || args.includes('-r') || args.length === 0) {
          setJobsList([]);
          outputElement = null;
        } else {
          const target = args[0] || '%1';
          const num = parseInt(target.replace('%', '')) || 1;
          setJobsList(prev => prev.filter(j => j.id !== num));
          outputElement = null;
        }
        break;
      }
      case 'coproc': {
        const name = args[0] || 'COPROC';
        const nextId = jobsList.length + 1;
        const newJob = { id: nextId, command: `coproc ${name} &`, status: 'Running' };
        setJobsList(prev => [...prev, newJob]);
        outputElement = <div className="text-stone-300 font-mono text-xs">[{nextId}] 314{nextId}</div>;
        break;
      }
      case 'wait': {
        outputElement = <div className="text-stone-505 italic font-mono text-xs">[wait: completed background subtasks]</div>;
        break;
      }
      case 'hash': {
        const counts: Record<string, number> = {};
        inputHistory.forEach(h => {
          const first = h.trim().split(/\s+/)[0];
          if (first) {
            counts[first] = (counts[first] || 0) + 1;
          }
        });
        const finalLogs = Object.entries(counts).filter(([_, count]) => count > 0);
        if (finalLogs.length === 0) {
          outputElement = <div className="text-stone-500 font-mono text-xs">hash: hash table empty</div>;
        } else {
          outputElement = (
            <div className="font-mono text-xs text-stone-300 space-y-0.5 select-text">
              <div className="text-stone-500">hits    command</div>
              {finalLogs.map(([c, count]) => (
                <div key={c}>
                  <span className="inline-block w-8 text-right pr-2 text-green-400">{count}</span>
                  <span>/bin/{c}</span>
                </div>
              ))}
            </div>
          );
        }
        break;
      }
      case 'times': {
        outputElement = (
          <div className="font-mono text-xs text-stone-300 select-text leading-relaxed">
            <div>0m0.038s 0m0.012s</div>
            <div>0m0.098s 0m0.046s</div>
          </div>
        );
        break;
      }
      case 'trap': {
        if (args.length === 0) {
          outputElement = (
            <div className="font-mono text-xs text-stone-400 select-text">
              trap -- 'echo "Session exited cleanly"' EXIT
              <br />
              trap -- 'echo "Terminal resized"' SIGWINCH
            </div>
          );
        } else {
          outputElement = <span className="text-stone-400 font-mono text-xs">trap: custom trap handler registered successfully</span>;
        }
        break;
      }
      case 'ulimit': {
        if (args.includes('-a')) {
          outputElement = (
            <div className="font-mono text-xs text-stone-300 whitespace-pre select-text leading-relaxed leading-normal">
{`core file size          (blocks, -c) 0
data seg size           (kbytes, -d) unlimited
scheduling priority             (-e) 0
file size               (blocks, -f) unlimited
pending signals                 (-i) 31057
max locked memory       (kbytes, -l) 65536
max memory size         (kbytes, -m) unlimited
open files                      (-n) 1024
pipe size            (512 bytes, -p) 8
POSIX message queues     (bytes, -q) 819200
real-time priority              (-r) 0
stack size              (kbytes, -s) 8192
cpu time               (seconds, -t) unlimited
max user processes              (-u) 31057
virtual memory          (kbytes, -v) unlimited
file locks                      (-x) unlimited`}
            </div>
          );
        } else {
          outputElement = <span className="text-stone-400 font-mono text-xs">unlimited</span>;
        }
        break;
      }
      case 'umask': {
        if (args.length > 0) {
          outputElement = null;
        } else {
          outputElement = <span className="text-stone-300 font-mono text-xs">0022</span>;
        }
        break;
      }
      case 'unset': {
        if (args.length > 0) {
          const varName = args[0];
          setEnvVars(prev => {
            const next = { ...prev };
            delete next[varName];
            return next;
          });
          setAliases(prev => {
            const next = { ...prev };
            delete next[varName];
            return next;
          });
        }
        outputElement = null;
        break;
      }
      case 'variables': {
        outputElement = (
          <div className="space-y-1 text-stone-300 font-mono text-xs select-text max-h-[220px] overflow-y-auto leading-relaxed">
            <div className="text-amber-400 font-bold uppercase mb-1">Standard BASH shell variables:</div>
            <div>[<span className="text-green-400 font-semibold">$USER</span>] - Current active shell username ({username})</div>
            <div>[<span className="text-green-400 font-semibold">$HOME</span>] - Home directory location (/home/{username})</div>
            <div>[<span className="text-green-400 font-semibold">$PWD</span>] - Current working directory path ({currentDir})</div>
            <div>[<span className="text-green-400 font-semibold">$SHELL</span>] - Core shell executor path (/bin/bash)</div>
            <div>[<span className="text-green-400 font-semibold">$PATH</span>] - Executive search directory paths</div>
            <div>[<span className="text-green-400 font-semibold">$TERM</span>] - Loaded terminal type emulator (xterm-256color)</div>
            <div>[<span className="text-green-400 font-semibold">$?</span>] - Return code status of the last utility program</div>
          </div>
        );
        break;
      }
      case 'printf': {
        if (args.length === 0) {
          outputElement = null;
        } else {
          let formatStr = args[0];
          if (formatStr.startsWith('"') && formatStr.endsWith('"')) {
            formatStr = formatStr.slice(1, -1);
          } else if (formatStr.startsWith("'") && formatStr.endsWith("'")) {
            formatStr = formatStr.slice(1, -1);
          }

          const formatArgs = args.slice(1).map(arg => {
            let str = expandEnvVars(arg);
            if (str.startsWith('"') && str.endsWith('"')) str = str.slice(1, -1);
            if (str.startsWith("'") && str.endsWith("'")) str = str.slice(1, -1);
            return str;
          });

          let output = formatStr
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '    ');

          formatArgs.forEach(arg => {
            output = output.replace('%s', arg);
          });

          outputElement = (
            <div className="text-stone-300 font-mono text-xs whitespace-pre select-text">
              {output}
            </div>
          );
        }
        break;
      }
      case 'read': {
        let promptVal = '';
        let targetVar = 'REPLY';
        const pIdx = args.indexOf('-p');
        if (pIdx !== -1 && args[pIdx + 1]) {
          promptVal = args[pIdx + 1];
          if (promptVal.startsWith('"') && promptVal.endsWith('"')) promptVal = promptVal.slice(1, -1);
          if (promptVal.startsWith("'") && promptVal.endsWith("'")) promptVal = promptVal.slice(1, -1);
          const remaining = [...args];
          remaining.splice(pIdx, 2);
          if (remaining[0]) {
            targetVar = remaining[0];
          }
        } else if (args[0]) {
          targetVar = args[0];
        }

        const textPrompt = prompt(promptVal || "Enter value:") || "";
        setEnvVars(prev => ({
          ...prev,
          [targetVar]: textPrompt
        }));
        outputElement = promptVal ? (
          <div className="font-mono text-xs text-stone-300">
            {promptVal}{textPrompt}
          </div>
        ) : null;
        break;
      }
      case 'readonly': {
        if (args.length === 0) {
          outputElement = (
            <div className="font-mono text-xs text-stone-400 select-text leading-relaxed">
              declare -r MY_PROTECTED_SYS_KEY="6e889b"
              <br />
              declare -r SHELL="/bin/bash"
            </div>
          );
        } else {
          outputElement = <span className="text-stone-400 font-mono text-xs">bash: readonly: variable flagged</span>;
        }
        break;
      }
      case 'set': {
        outputElement = (
          <div className="space-y-0.5 text-stone-300 font-mono text-xs select-text leading-relaxed max-h-[160px] overflow-y-auto">
            {Object.entries(envVars).map(([key, val]) => (
              <div key={key}>{key}='{val}'</div>
            ))}
            <div className="text-stone-500 mt-1">BASHOPTS=checkwinsize:cmdhist:complete_fullquote:expand_aliases:extglob:extquote:force_fignore:globstar:interactive_comments:progcomp:promptvars</div>
          </div>
        );
        break;
      }
      case 'shopt': {
        const opts = ['autocd', 'cdspell', 'checkjobs', 'checkwinsize', 'cmdhist', 'complete_fullquote', 'direxpand', 'dirspell', 'dotglob', 'execfail', 'expand_aliases', 'extglob', 'extquote', 'failglob', 'force_fignore', 'globasciiranges', 'globstar', 'gnu_errfmt', 'histappend', 'histreedit', 'histverify', 'hostcomplete', 'huponexit', 'interactive_comments', 'lastpipe', 'lithist', 'localvar_inherit', 'mailwarn', 'no_empty_cmd_completion', 'nocaseglob', 'nocasematch', 'nullglob', 'progcomp', 'progcomp_alias', 'promptvars', 'restricted_shell', 'shift_verbose', 'sourcepath', 'xpg_echo'];
        outputElement = (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-0.5 text-stone-300 font-mono text-xs select-text max-h-[200px] overflow-y-auto leading-relaxed">
            {opts.map(o => (
              <div key={o} className="flex justify-between w-full max-w-[200px]">
                <span className="text-stone-400">{o}</span>
                <span className={o === 'checkwinsize' || o === 'cmdhist' || o === 'expand_aliases' || o === 'promptvars' ? 'text-green-400' : 'text-stone-600'}>
                  {o === 'checkwinsize' || o === 'cmdhist' || o === 'expand_aliases' || o === 'promptvars' ? 'on' : 'off'}
                </span>
              </div>
            ))}
          </div>
        );
        break;
      }
      case 'shift': {
        outputElement = <span className="text-stone-500 italic font-mono text-xs">shifted positional parameters</span>;
        break;
      }
      case 'time': {
        if (args.length === 0) {
          outputElement = (
            <div className="font-mono text-xs text-stone-305 leading-relaxed">
              real    0m0.000s
              <br />
              user    0m0.000s
              <br />
              sys     0m0.000s
            </div>
          );
        } else {
          const subcmd = args.join(' ');
          executeCommand(subcmd);
          outputElement = (
            <div className="font-mono text-xs text-stone-400 border-t border-stone-850 pt-1.5 mt-1 leading-relaxed select-none">
              real    0m0.003s
              <br />
              user    0m0.001s
              <br />
              sys     0m0.001s
            </div>
          );
        }
        break;
      }
      case 'type': {
        if (args.length === 0) {
          outputElement = <span className="text-red-400 font-mono text-xs">bash: type: missing operand</span>;
        } else {
          const checkCmd = args[0].toLowerCase();
          const builtins = ['help', 'cd', 'pwd', 'echo', 'exit', 'logout', 'clear', 'export', 'env', 'alias', 'unalias', 'jobs', 'bg', 'fg', 'wait', 'coproc', 'readonly', 'set', 'shopt', 'shift', 'test', 'let', 'type', 'declare', 'typeset', 'dirs', 'pushd', 'popd', 'source', '.', 'eval', 'exec', 'history', 'trap', 'ulimit', 'umask', 'hash', 'times', 'builtin', 'enable', 'suspend'];
          if (aliases[checkCmd]) {
            outputElement = <span className="text-stone-300 font-mono text-xs">{checkCmd} is aliased to `{aliases[checkCmd]}`</span>;
          } else if (builtins.includes(checkCmd)) {
            outputElement = <span className="text-stone-300 font-mono text-xs">{checkCmd} is a shell builtin</span>;
          } else if (checkCmd === 'neofetch' || checkCmd === 'cmatrix' || checkCmd === 'ping') {
            outputElement = <span className="text-stone-300 font-mono text-xs">{checkCmd} is /usr/bin/{checkCmd}</span>;
          } else {
            outputElement = <span className="text-red-400 font-mono text-xs">bash: type: {checkCmd}: not found</span>;
          }
        }
        break;
      }
      case 'dirs': {
        outputElement = (
          <div className="text-sky-400 font-mono text-xs select-text">
            {currentDir} {dirStack.join(' ')}
          </div>
        );
        break;
      }
      case 'pushd': {
        if (args.length === 0) {
          outputElement = <span className="text-red-400 font-mono text-xs">bash: pushd: no other directory</span>;
        } else {
          const target = args[0];
          let cleanTarget = target;
          if (target === '~') cleanTarget = `/home/${username}`;
          const previous = currentDir;
          setDirStack(prev => [previous, ...prev]);
          setCurrentDir(cleanTarget);
          setEnvVars(prev => ({ ...prev, PWD: cleanTarget }));
          outputElement = (
            <div className="text-sky-400 font-mono text-xs select-text">
              {cleanTarget} {previous} {dirStack.join(' ')}
            </div>
          );
        }
        break;
      }
      case 'popd': {
        if (dirStack.length === 0) {
          outputElement = <span className="text-red-400 font-mono text-xs">bash: popd: directory stack empty</span>;
        } else {
          const popped = dirStack[0];
          setDirStack(prev => prev.slice(1));
          setCurrentDir(popped);
          setEnvVars(prev => ({ ...prev, PWD: popped }));
          outputElement = (
            <div className="text-sky-400 font-mono text-xs select-text">
              {popped} {dirStack.slice(1).join(' ')}
            </div>
          );
        }
        break;
      }
      case 'source':
      case '.': {
        if (args.length === 0) {
          outputElement = <span className="text-red-400 font-mono text-xs">bash: .: filename argument required</span>;
        } else {
          const filename = args[0].toLowerCase();
          const userKey = `landala_virtual_files_${username}`;
          let filesData = localStorage.getItem(userKey);
          if (!filesData && username === 'fossguru') {
            filesData = localStorage.getItem('landala_virtual_files');
          }
          let virtualFilesList: any[] = [];
          if (filesData) {
            try { virtualFilesList = JSON.parse(filesData); } catch (e) {}
          }
          const found = virtualFilesList.find(f => f.name.toLowerCase() === filename);
          if (found) {
            const lines = (found.content || '').split('\n').map((l: string) => l.trim()).filter(Boolean);
            lines.forEach((line: string) => executeCommand(line));
            outputElement = <span className="text-green-400 font-mono text-xs">Executed script "{args[0]}" cleanly</span>;
          } else {
            outputElement = <span className="text-red-400 font-mono text-xs">bash: .: {args[0]}: No such file or directory</span>;
          }
        }
        break;
      }
      case 'eval': {
        const evalCmd = args.join(' ');
        if (evalCmd) {
          executeCommand(evalCmd);
        }
        outputElement = null;
        break;
      }
      case 'exec': {
        outputElement = <span className="text-yellow-400 font-mono text-xs">bash: exec: replaced active terminal process, booting default interactive console</span>;
        setBooting(true);
        break;
      }
      case 'logout':
      case 'exit': {
        setHistory([]);
        setBootLines([]);
        setBooting(true);
        outputElement = null;
        break;
      }
      case 'fc': {
        outputElement = (
          <div className="font-mono text-xs text-stone-400 select-text leading-relaxed">
            {inputHistory.slice(0, 16).reverse().map((cmdStr, idx) => (
              <div key={idx}>{100 + idx}  {cmdStr}</div>
            ))}
          </div>
        );
        break;
      }
      case 'for':
      case 'while':
      case 'until':
      case 'if':
      case 'case':
      case 'function':
      case 'select': {
        const rawLine = [cmd, ...args].join(' ');
        const forMatch = rawLine.match(/for\s+(\w+)\s+in\s+([^;]+);\s*do\s+([^;]+);\s*done/i);
        if (forMatch) {
          const varName = forMatch[1];
          const words = forMatch[2].trim().split(/\s+/);
          const block = forMatch[3].trim();
          
          const executionResults: React.ReactNode[] = [];
          words.forEach(w => {
            const originalVal = envVars[varName];
            envVars[varName] = w;
            
            const boundCmd = block.replace(new RegExp('\\$' + varName, 'g'), w);
            let lineTxt = boundCmd;
            if (lineTxt.startsWith('echo ')) {
              let text = lineTxt.slice(5).trim();
              if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1);
              if (text.startsWith("'") && text.endsWith("'")) text = text.slice(1, -1);
              text = text.replace(new RegExp('\\$' + varName, 'g'), w);
              executionResults.push(<div key={w} className="text-stone-300 font-mono text-xs">{expandEnvVars(text)}</div>);
            } else {
              executionResults.push(<div key={w} className="text-stone-300 font-mono text-xs">{boundCmd}</div>);
            }
            
            if (originalVal !== undefined) {
              envVars[varName] = originalVal;
            } else {
              delete envVars[varName];
            }
          });
          
          outputElement = <div className="space-y-0.5">{executionResults}</div>;
        } else {
          outputElement = (
            <div className="font-mono text-xs text-stone-300 select-text leading-relaxed">
              <span className="text-amber-400 font-bold block">Bash Loop / Block Construct Reference Guide:</span>
              <div>• For loop syntax: <span className="text-green-400">for i in a b c; do echo $i; done</span></div>
              <div>• If conditional syntax: <span className="text-green-400">if COMMANDS; then COMMANDS; fi</span></div>
              <div>• While loop syntax: <span className="text-green-400">while COMMANDS; do COMMANDS; done</span></div>
              <div className="text-stone-500 italic mt-1">Simulated parser evaluated context gracefully.</div>
            </div>
          );
        }
        break;
      }
      case 'builtin': {
        if (args.length > 0) {
          const sub = args.join(' ');
          executeCommand(sub);
          outputElement = null;
        } else {
          outputElement = <span className="text-stone-400 font-mono text-xs">bash: builtin: requires arguments</span>;
        }
        break;
      }
      case 'enable': {
        outputElement = <span className="text-green-400 font-mono text-xs">GNU bash shell builtins enabled successfully</span>;
        break;
      }
      case 'local': {
        outputElement = <span className="text-stone-405 font-mono text-xs">bash: local: can only be used in a function</span>;
        break;
      }
      case 'caller': {
        outputElement = <span className="text-stone-400 font-mono text-xs">0 main /bin/bash</span>;
        break;
      }
      case 'compgen': {
        const words = ['help', 'cd', 'pwd', 'echo', 'exit', 'logout', 'clear', 'export', 'env', 'alias', 'unalias', 'jobs', 'bg', 'fg', 'wait', 'coproc', 'readonly', 'set', 'shopt', 'shift', 'test', 'let', 'type', 'declare', 'typeset', 'dirs', 'pushd', 'popd', 'source', '.', 'eval', 'exec', 'history', 'trap', 'ulimit', 'umask', 'hash', 'times', 'builtin', 'enable', 'suspend'];
        outputElement = (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1 font-mono text-xs text-stone-300">
            {words.map(w => <span key={w}>{w}</span>)}
          </div>
        );
        break;
      }
      case 'complete':
      case 'compopt': {
        outputElement = null;
        break;
      }
      case 'getopts': {
        outputElement = <span className="text-red-400 font-mono text-xs">getopts: option requires an argument</span>;
        break;
      }
      case 'return': {
        outputElement = <span className="text-red-400 font-mono text-xs">bash: return: can only \`return' from a function or sourced script</span>;
        break;
      }
      case 'theme': {
        if (args.length === 0) {
          outputElement = (
            <div className="space-y-1 font-mono text-xs select-text">
              <span className="text-amber-400 font-bold block">Current Installed Landala Themes:</span>
              {THEMES.map(t => (
                <div key={t.id} className="text-xs">
                  <span className={`font-mono font-bold ${t.id === theme.id ? 'text-green-400' : 'text-stone-300'}`}>
                    • {t.id} {t.id === theme.id ? '(active)' : ''}
                  </span>
                  <span className="text-stone-500 ml-2">[{t.name} - {t.tagline}]</span>
                </div>
              ))}
              <span className="block text-[11px] text-zinc-500 italic mt-1">To change theme, type: theme [themeId] (e.g., theme sapphire)</span>
            </div>
          );
        } else {
          const targetThemeId = args[0].toLowerCase();
          const themeExists = THEMES.some(t => t.id === targetThemeId);
          if (themeExists) {
            onThemeChange(targetThemeId as ThemeId);
            outputElement = (
              <div className="text-green-400 flex items-center gap-1.5 font-semibold font-mono text-xs select-text">
                <CheckCircle2 className="w-4 h-4" />
                <span>Successfully synchronized and set system theme to "{targetThemeId}".</span>
              </div>
            );
          } else {
            outputElement = (
              <div className="text-red-400 flex items-center gap-1.5 font-mono text-xs select-text">
                <AlertCircle className="w-4 h-4" />
                <span>Error: Theme "{targetThemeId}" not recognized. Type "theme" for list.</span>
              </div>
            );
          }
        }
        break;
      }
      case 'ls': {
        const showLong = args.some(arg => arg.includes('l'));
        const showAll = args.some(arg => arg.includes('a'));

        let items: { name: string; isDir: boolean; size: number; permissions: string }[] = [];

        if (showAll) {
          items.push({ name: '.', isDir: true, size: 4096, permissions: 'drwxr-xr-x' });
          items.push({ name: '..', isDir: true, size: 4096, permissions: 'drwxr-xr-x' });
        }

        if (currentDir === '/') {
          const folders = ['bin', 'boot', 'dev', 'etc', 'home', 'lib', 'mnt', 'proc', 'root', 'sys', 'tmp', 'usr', 'var'];
          folders.forEach(f => items.push({ name: f, isDir: true, size: 4096, permissions: 'drwxr-xr-x' }));
        } else if (currentDir === '/home') {
          items.push({ name: username, isDir: true, size: 4096, permissions: 'drwxr-xr-x' });
        } else if (currentDir === `/home/${username}`) {
          const subdirs = ['desktop', 'documents', 'downloads', 'music', 'pictures'];
          subdirs.forEach(s => items.push({ name: s, isDir: true, size: 4096, permissions: 'drwxr-xr-x' }));
        } else if (currentDir === `/home/${username}/desktop`) {
          const userKey = `landala_virtual_files_${username}`;
          let filesData = localStorage.getItem(userKey);
          if (!filesData && username === 'fossguru') {
            filesData = localStorage.getItem('landala_virtual_files');
          }
          let virtualFilesList: any[] = [];
          if (filesData) {
            try { virtualFilesList = JSON.parse(filesData); } catch (e) {}
          }
          virtualFilesList.forEach(f => {
            items.push({ name: f.name, isDir: false, size: f.content?.length || 0, permissions: '-rw-r--r--' });
          });
        }

        if (items.length === 0) {
          outputElement = <div className="text-stone-500 italic text-xs">[Empty directory]</div>;
        } else {
          if (showLong) {
            outputElement = (
              <div className="font-mono text-xs text-stone-300 space-y-0.5 leading-relaxed select-text">
                <div className="text-[10px] text-stone-500 font-bold mb-1 uppercase">total {items.length * 4}</div>
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <span className="text-stone-500">{item.permissions}</span>
                    <span className="text-stone-500">1 {username} {username}</span>
                    <span className="text-green-500 text-right min-w-[32px]">{item.size}</span>
                    <span className="text-stone-500 font-mono">Jun 23 06:17</span>
                    <span className={item.isDir ? 'text-sky-400 font-bold' : 'text-green-300'}>
                      {item.name}{item.isDir ? '/' : ''}
                    </span>
                  </div>
                ))}
              </div>
            );
          } else {
            outputElement = (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 select-text font-mono text-xs">
                {items.map((item, idx) => (
                  <span key={idx} className={item.isDir ? 'text-sky-400 font-bold' : 'text-green-305'}>
                    {item.isDir ? '📁' : '📄'} {item.name}{item.isDir ? '/' : ''}
                  </span>
                ))}
              </div>
            );
          }
        }
        break;
      }
      case 'cat': {
        if (args.length === 0) {
          outputElement = <span className="text-red-400 font-mono text-xs">Usage: cat [filename] (e.g., cat notes.txt)</span>;
        } else {
          const filename = args[0].toLowerCase();
          const userKey = `landala_virtual_files_${username}`;
          let filesData = localStorage.getItem(userKey);
          if (!filesData && username === 'fossguru') {
            filesData = localStorage.getItem('landala_virtual_files');
          }
          let virtualFilesList: any[] = [];
          if (filesData) {
            try {
              virtualFilesList = JSON.parse(filesData);
            } catch (e) {}
          }
          const found = virtualFilesList.find(f => f.name.toLowerCase() === filename);
          if (found) {
            outputElement = (
              <div className="p-2.5 bg-black/40 border border-stone-800 rounded font-mono text-xs text-stone-300 whitespace-pre-wrap leading-relaxed max-height-[200px] overflow-y-auto">
                {found.content || '[Empty file]'}
              </div>
            );
          } else {
            outputElement = <span className="text-red-400 font-mono text-xs">bash: cat: {args[0]}: No such file or directory</span>;
          }
        }
        break;
      }
      case 'rm': {
        if (args.length === 0) {
          outputElement = <span className="text-red-400 font-mono text-xs">Usage: rm [filename or appId]</span>;
        } else {
          const target = args[0];
          const app = installedApps.find(a => a.id.toLowerCase() === target.toLowerCase());
          if (app) {
            if (app.id === 'trash' || app.id === 'terminal' || app.id === 'settings' || app.id === 'files') {
              outputElement = <span className="text-red-400 font-mono text-xs">Error: System core app "{app.title}" is protected and cannot be deleted!</span>;
            } else {
              onUninstallApp(app.id);
              outputElement = (
                <span className="text-green-400 font-mono text-xs">
                  Successfully uninstalled and sent app "{app.title}" to the Trash Bin!
                </span>
              );
            }
          } else {
            const userKey = `landala_virtual_files_${username}`;
            let filesData = localStorage.getItem(userKey);
            if (!filesData && username === 'fossguru') {
              filesData = localStorage.getItem('landala_virtual_files');
            }
            let virtualFilesList: any[] = [];
            if (filesData) {
              try {
                virtualFilesList = JSON.parse(filesData);
              } catch (e) {}
            }
            const foundIdx = virtualFilesList.findIndex(f => f.name.toLowerCase() === target.toLowerCase());
            if (foundIdx !== -1) {
              const fileName = virtualFilesList[foundIdx].name;
              virtualFilesList.splice(foundIdx, 1);
              localStorage.setItem(userKey, JSON.stringify(virtualFilesList));
              outputElement = (
                <span className="text-yellow-400 font-mono text-xs">
                  Removed file "{fileName}"
                </span>
              );
            } else {
              outputElement = (
                <span className="text-red-400 font-mono text-xs">
                  rm: cannot remove '{target}': No such file or directory
                </span>
              );
            }
          }
        }
        break;
      }
      case 'install': {
        if (args.length === 0) {
          outputElement = (
            <div className="space-y-1 font-mono text-xs select-text">
              <span className="text-amber-400 font-bold block">Apps available to Install / Reactivate:</span>
              <div>• game-boing <span className="text-stone-500">(Boing Arcade Game)</span></div>
              <div>• game-unblock <span className="text-stone-500">(Unblock FRVR Slider)</span></div>
              <div>• game-ballcrash <span className="text-stone-500">(Ball Crash Puzzle)</span></div>
              <span className="block text-stone-500 text-[10px] italic mt-1">Usage: install [appName]</span>
            </div>
          );
        } else {
          const searchId = args[0].toLowerCase();
          const allPreInstalled = [
            { 
              id: 'game-unblock', 
              title: 'Unblock FRVR', 
              icon: 'https://www.google.com/s2/favicons?sz=64&domain=unblock.frvr.com', 
              type: 'game', 
              url: 'https://unblock.frvr.com/alc/?web&source=frvr.com&action=browse_filtered&theme=light' 
            },
            { 
              id: 'game-boing', 
              title: 'Boing FRVR', 
              icon: 'https://www.google.com/s2/favicons?sz=64&domain=boing.frvr.com', 
              type: 'game', 
              url: 'https://boing.frvr.com/alc/?web&source=frvr.com&action=browse_filtered&theme=light' 
            },
            { 
              id: 'game-ballcrash', 
              title: 'Ball Crash FRVR', 
              icon: 'https://www.google.com/s2/favicons?sz=64&domain=ballcrash.frvr.com', 
              type: 'game', 
              url: 'https://ballcrash.frvr.com/alc/?web&source=frvr.com&action=browse_filtered&theme=light' 
            },
          ];
          const found = allPreInstalled.find(p => p.id === searchId);
          if (found) {
            onInstallApp(found as any);
            outputElement = (
              <span className="text-green-400 font-bold font-mono text-xs select-text">
                Pinned and registered app "{found.title}" to the active desktop screen!
              </span>
            );
          } else {
            outputElement = <span className="text-red-400 font-mono text-xs">install: App code "{searchId}" is not available in system catalogs. Try "game-boing".</span>;
          }
        }
        break;
      }
      case 'sudo': {
        outputElement = (
          <div className="font-mono text-xs text-stone-300">
            usage: sudo [-DbEHknPS] [-C num] [-g group] [-h host] [-p prompt] [-u user] [command]
          </div>
        );
        break;
      }
      case 'lpm': {
        const subcmd = args[0]?.toLowerCase();
        if (!subcmd || subcmd === 'help' || subcmd === '-h' || subcmd === '--help') {
          outputElement = (
            <div className="space-y-1 font-mono text-xs select-text">
              <div className="text-emerald-400 font-bold flex items-center gap-1.5 mb-1 text-sm">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Landala Package Manager (lpm) - v1.0.4</span>
              </div>
              <div className="text-stone-300">Usage: <span className="text-amber-400">sudo lpm install &lt;website_url&gt; &lt;app_name&gt;</span></div>
              <div className="text-stone-300">       <span className="text-amber-400">lpm list</span></div>
              <div className="text-stone-300">       <span className="text-amber-400">lpm search</span></div>
              <div className="text-stone-300">       <span className="text-amber-400">sudo lpm uninstall &lt;app_id&gt;</span></div>
              <div className="text-stone-500 mt-2">----------------------------------------------------</div>
              <div className="font-bold text-stone-400 uppercase tracking-wider text-[10px] mt-2 mb-1">Available Commands:</div>
              <div className="grid grid-cols-[140px_1fr] gap-x-2 gap-y-1 text-stone-300">
                <span className="text-emerald-400 font-semibold">  install &lt;url&gt; &lt;name&gt;</span>
                <span className="text-stone-400">Install an external website as a standalone desktop app</span>
                
                <span className="text-emerald-400 font-semibold">  uninstall &lt;id&gt;</span>
                <span className="text-stone-400">Remove a custom web app or package from the system</span>
                
                <span className="text-emerald-400 font-semibold">  list</span>
                <span className="text-stone-400">View currently installed packages and applications</span>
                
                <span className="text-emerald-400 font-semibold">  search &lt;query&gt;</span>
                <span className="text-stone-400">Search the catalog for official and community applications</span>
                
                <span className="text-emerald-400 font-semibold">  update / upgrade</span>
                <span className="text-stone-400">Refresh application catalogues and update core resources</span>
              </div>
              <div className="text-[11px] text-stone-500 italic mt-2.5">
                * Note: Installing or uninstalling software requires administrative authority. 
                Please prepend `<span className="text-amber-500 font-bold">sudo</span>` to write changes.
              </div>
            </div>
          );
        } else if (subcmd === 'install') {
          if (!isSudo) {
            outputElement = (
              <div className="text-red-400 font-mono text-xs flex flex-col gap-1 select-text">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>lpm: Permission Denied. superuser (root) privilege required.</span>
                </div>
                <div className="text-stone-500 italic pl-5.5">Are you root? Try running this command with: <span className="text-stone-300 font-normal">sudo lpm install ...</span></div>
              </div>
            );
          } else {
            const websiteArg = args[1];
            const nameArg = args.slice(2).join(' ').trim();
            
            if (!websiteArg || !nameArg) {
              outputElement = (
                <div className="text-red-400 font-mono text-xs select-text">
                  <div className="font-bold">lpm: error: missing parameters.</div>
                  <div className="text-stone-400 mt-1">Usage: <span className="text-amber-400 font-semibold">sudo lpm install &lt;website_url&gt; &lt;app_name&gt;</span></div>
                  <div className="text-stone-500 italic mt-0.5">Example: sudo lpm install youtube.com YouTube</div>
                </div>
              );
            } else {
              let cleanUrl = websiteArg.trim();
              if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
                cleanUrl = 'https://' + cleanUrl;
              }
              const cleanName = nameArg;
              const appId = 'lpm-' + cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
              
              let domain = '';
              try {
                const urlObj = new URL(cleanUrl);
                domain = urlObj.hostname;
              } catch (e) {
                domain = websiteArg;
              }
              const cleanFaviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
              
              const newApp = {
                id: appId,
                title: cleanName,
                icon: cleanFaviconUrl,
                type: 'web',
                url: cleanUrl,
                isCustom: true
              };

              onInstallApp(newApp as any);
              
              outputElement = (
                <div className="font-mono text-xs select-text space-y-1">
                  <div className="text-stone-500 flex items-center justify-between">
                    <span>Retrieving remote packages: {cleanUrl}...</span>
                    <span className="text-green-400 font-bold">100%</span>
                  </div>
                  <div className="text-stone-500 flex items-center justify-between">
                    <span>Resolving binary targets and favicon mappings...</span>
                    <span className="text-green-400 font-bold">Done</span>
                  </div>
                  <div className="text-stone-500 flex items-center justify-between">
                    <span>Verifying integrity indexes: {appId}.deb...</span>
                    <span className="text-green-400 font-bold">Verified</span>
                  </div>
                  <div className="text-stone-400 pt-1">
                    📦 <span className="text-emerald-400 font-bold">Successfully installed {cleanName}</span> as a standalone lpm workspace app!
                  </div>
                  <div className="text-[11px] text-stone-500 italic pt-0.5">
                    Double-click the new shortcut icon on your Desktop, or search the Start Menu to launch.
                  </div>
                </div>
              );
            }
          }
        } else if (subcmd === 'uninstall') {
          if (!isSudo) {
            outputElement = (
              <div className="text-red-400 font-mono text-xs flex flex-col gap-1 select-text">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>lpm: Permission Denied. superuser (root) privilege required.</span>
                </div>
                <div className="text-stone-500 italic pl-5.5">Are you root? Try running this command with: <span className="text-stone-300 font-normal">sudo lpm uninstall ...</span></div>
              </div>
            );
          } else {
            const appId = args[1]?.toLowerCase();
            if (!appId) {
              outputElement = (
                <div className="text-red-400 font-mono text-xs select-text">
                  <div className="font-bold">lpm: error: missing app ID.</div>
                  <div className="text-stone-400">Usage: <span className="text-amber-400 font-semibold">sudo lpm uninstall &lt;app_id&gt;</span></div>
                </div>
              );
            } else {
              const appExists = installedApps.find(a => a.id.toLowerCase() === appId || a.title.toLowerCase() === appId);
              if (appExists) {
                if (appExists.id === 'trash' || appExists.id === 'terminal' || appExists.id === 'settings' || appExists.id === 'files') {
                  outputElement = <span className="text-red-400 font-mono text-xs">Error: Core bundle application "{appExists.title}" is protected and cannot be deleted via lpm.</span>;
                } else {
                  onUninstallApp(appExists.id);
                  outputElement = (
                    <div className="text-green-400 font-mono text-xs select-text space-y-1">
                      <div>Preparing package deletion maps: {appExists.id}...</div>
                      <div>[OK] Purging local sandbox databases and variables.</div>
                      <div className="font-semibold text-emerald-400">Successfully uninstalled package "{appExists.title}" completely.</div>
                    </div>
                  );
                }
              } else {
                outputElement = <span className="text-red-400 font-mono text-xs">lpm: error: app id or package "{appId}" is not currently installed.</span>;
              }
            }
          }
        } else if (subcmd === 'list') {
          const lpmApps = installedApps.filter(app => app.id.startsWith('lpm-') || app.isCustom);
          const systemApps = installedApps.filter(app => !app.id.startsWith('lpm-') && !app.isCustom);
          
          outputElement = (
            <div className="space-y-2 font-mono text-xs select-text leading-relaxed">
              <div>
                <span className="text-amber-400 font-bold uppercase tracking-wide block mb-1">Installed Native System Apps:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-0.5 text-stone-300">
                  {systemApps.map(a => (
                    <div key={a.id} className="flex items-center gap-1">
                      <span className="text-stone-500">•</span>
                      <span className="text-emerald-400 font-bold">{a.id}</span>
                      <span className="text-stone-500 font-mono text-[10px]">({a.title})</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {lpmApps.length > 0 ? (
                <div>
                  <span className="text-sky-400 font-bold uppercase tracking-wide block mb-1">Custom Installed LPM Packages:</span>
                  <div className="space-y-1.5">
                    {lpmApps.map(a => (
                      <div key={a.id} className="border-l-2 border-sky-500 pl-2 py-0.5 bg-stone-900/35 rounded-r">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">{a.title}</span>
                          <span className="text-[10px] text-sky-400 px-1 bg-sky-950/40 border border-sky-900/40 rounded">{a.id}</span>
                        </div>
                        <div className="text-stone-400 font-mono text-[10px] truncate">{a.url}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-stone-500 italic mt-1 bg-stone-900/10 p-1.5 border border-stone-850 rounded">
                  No custom third-party LPM packages installed yet. Use 'sudo lpm install [website] [app_name]' to install.
                </div>
              )}
            </div>
          );
        } else if (subcmd === 'search') {
          const q = args.slice(1).join(' ').toLowerCase();
          const suggestions = [
            { name: 'xkcd Comic Reader', url: 'xkcd.com', desc: 'Silly stick figure comic pages' },
            { name: 'Wikipedia', url: 'wikipedia.org', desc: 'The free catalog of human history encyclopedia' },
            { name: 'Retro Emulator Game', url: 'playclassic.games', desc: 'Massive library of retro classic games' },
            { name: 'DevDocs API Search', url: 'devdocs.io', desc: 'Fast, offline developer manuals' },
            { name: 'CalcTab Pro', url: 'calculator.com', desc: 'Intelligent engineering calculus utility' },
            { name: 'Trello Board Planner', url: 'trello.com', desc: 'Visual task organization cards' },
          ];
          
          const filtered = q 
            ? suggestions.filter(s => s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q) || s.url.includes(q))
            : suggestions;
            
          outputElement = (
            <div className="space-y-1.5 font-mono text-xs select-text">
              <div className="text-amber-400 font-semibold mb-1">
                {q ? `Search results for "${q}" in active repositories:` : 'Recommended LPM Catalog Packages:'}
              </div>
              {filtered.length > 0 ? (
                <div className="space-y-1">
                  {filtered.map((s, idx) => (
                    <div key={idx} className="bg-stone-900/40 p-1.5 rounded border border-stone-850 flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                      <div>
                        <div className="text-emerald-400 font-bold">{s.name}</div>
                        <div className="text-[10px] text-stone-500">{s.desc}</div>
                      </div>
                      <div className="text-stone-400 shrink-0 select-all font-semibold bg-stone-850 px-2 py-0.5 rounded text-[10px] self-start md:self-auto">
                        sudo lpm install {s.url} "{s.name}"
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-stone-500 italic">No exact package records match "{q}". However, you can still install any arbitrary website by typing: sudo lpm install &lt;url&gt; "&lt;name&gt;"</div>
              )}
            </div>
          );
        } else if (subcmd === 'update') {
          outputElement = (
            <div className="space-y-0.5 font-mono text-xs select-text text-stone-300">
              <div>Get:1 https://package.landala.org/ubuntu cosmic InRelease [21.4 kB]</div>
              <div>Get:2 https://catalog.lpm-packages.io stable InRelease [102 kB]</div>
              <div>Get:3 https://catalog.lpm-packages.io stable/main amd64 Packages [4,064 B]</div>
              <div className="text-green-400 font-bold pt-1">Reading database package lists... Done (Refresh OK)</div>
              <div className="text-stone-400 italic font-medium">LPM indexes successfully synchronized. 6 programs can be upgraded.</div>
            </div>
          );
        } else if (subcmd === 'upgrade') {
          outputElement = (
            <div className="space-y-0.5 font-mono text-xs select-text text-stone-300">
              <div>Calculating upgrade vectors... Done</div>
              <div>The following packages will be upgraded:</div>
              <div className="text-sky-400">  lpm core-bin  (1.0.3 {"->"} 1.0.4)</div>
              <div className="text-sky-400">  landala-wm    (v1.2.1 {"->"} v1.2.2)</div>
              <div className="text-sky-400">  lofi-synthesizer (0.9.8 {"->"} 1.0.0)</div>
              <div>3 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.</div>
              <div>[OK] Package updates fetched, unpacking libraries, rewriting config blocks... Done</div>
              <div className="text-green-400 font-bold pt-1">All core system packages are fully up-to-date. Thank you for using Landala Linux!</div>
            </div>
          );
        } else {
          outputElement = <span className="text-red-400 font-mono text-xs">lpm: error: unknown command "{subcmd}". Type "lpm help" to see options.</span>;
        }
        break;
      }
      case 'neofetch': {
        outputElement = (
          <div className="flex flex-col sm:flex-row items-start gap-4 select-text font-mono text-xs">
            <pre className="text-rose-400 font-bold leading-none text-[9px] whitespace-pre select-none shrink-0">
{`          __..-''"''-..__
      _.-'               '-._
    .'                       '.
   /                           \\
  ;                             ;
  |   _     _ _ _ _     _     _ |
  ;  ( \\   / ) (_ _\\   / )   / );
   \\  \\ \\_/ /   _ _\\  / /   / /
    '. \\_ _/   (_ _\\ (_/   (_/.'
      '-._               _.-'
          ''-..__..-''`}
            </pre>
            <div className="text-stone-300 space-y-0.5 min-w-0">
              <div className="text-amber-400 font-black text-sm">{username}@landala-pc</div>
              <div className="text-stone-500">--------------------------</div>
              <div><span className="text-green-400 font-bold">OS:</span> Ubuntu 24.04 LTS (Ubuntu GNU/Linux x86_64)</div>
              <div><span className="text-green-400 font-bold">Host:</span> Landala Lofi Intel Core vM8</div>
              <div><span className="text-green-400 font-bold">Kernel:</span> 6.8.0-31-generic (GNU Bash)</div>
              <div><span className="text-green-400 font-bold">Uptime:</span> up 1 hour, 42 mins</div>
              <div><span className="text-green-400 font-bold">Shell:</span> bash 5.2.21</div>
              <div><span className="text-green-400 font-bold">Active Theme:</span> {theme.name} ({theme.id})</div>
              <div><span className="text-green-400 font-bold">Active Wallpaper:</span> {theme.id}.jpg</div>
              <div><span className="text-green-400 font-bold">Virtual Drive RAM:</span> 1.2 MB / 16.0 MB (Allocated)</div>
              <div><span className="text-green-400 font-bold">Display:</span> Lofi Canvas (Responsive frame)</div>
            </div>
          </div>
        );
        break;
      }
      default: {
        outputElement = (
          <div className="text-red-400 font-mono text-xs">
            bash: {cmd}: command not found
          </div>
        );
      }
    }

    setHistory(prev => [...prev, { command: fullCmd, output: outputElement }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(inputText);
      setInputText('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (inputHistory.length > 0) {
        const nextIndex = Math.min(cmdIndex + 1, inputHistory.length - 1);
        setCmdIndex(nextIndex);
        setInputText(inputHistory[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cmdIndex > 0) {
        const nextIndex = cmdIndex - 1;
        setCmdIndex(nextIndex);
        setInputText(inputHistory[nextIndex]);
      } else if (cmdIndex === 0) {
        setCmdIndex(-1);
        setInputText('');
      }
    }
  };

  if (isMatrixMode) {
    return (
      <div 
        onClick={() => setIsMatrixMode(false)}
        className="w-full h-full bg-black text-green-500 font-mono text-[11px] p-4 flex flex-col justify-between overflow-hidden cursor-pointer select-none relative"
      >
        <div className="absolute top-2 right-4 text-[9px] opacity-60 uppercase bg-green-950/80 px-2 py-0.5 rounded border border-green-800/45 animate-pulse">
          Click anywhere to exit Matrix mode
        </div>
        
        <div className="flex-1 overflow-hidden pointer-events-none relative flex flex-col justify-center items-center text-center">
          <pre className="text-green-400 font-mono text-center select-none whitespace-pre animate-pulse text-[13px] leading-tight">
{`
=== BASH MEMORY SEGMENT ACTIVE ===
[IP/EIP: 0x804fbcb0   SP: 0x7ffd986c]
STATUS: HIGH VELOCITY PARALLEL THREADS EXECUTION

01001101 Linux Host Terminal Emulator Engine
11010110 Lofi organic waves tuned at 417Hz
00011001 Core audio synthesize: buffer live
11100110 System registers clean memory map
`}
          </pre>
          <div className="mt-4 text-xs font-bold text-white bg-green-905 border border-green-500/30 px-3 py-1.5 rounded uppercase tracking-wider animate-bounce">
            Executing bash subprocesses seamlessly
          </div>
        </div>

        <div className="flex justify-between text-[10px] text-green-700 font-mono shrink-0">
          <span>PIPELINE: STREAMING_ACTIVE</span>
          <span>MEMORY_USE: 1.2MB</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full bg-stone-950/95 text-stone-200 font-mono flex flex-col justify-start select-text overflow-hidden relative border border-stone-800 rounded-b-xl"
    >
      {/* Top Controller Header Tab Bar for changing Terminal context */}
      <div className="flex items-center justify-between border-b border-stone-850 px-4 py-2 shrink-0 select-none bg-stone-900/40">
        <div className="flex items-center gap-1.5">
          <TerminalIcon className="w-4 h-4 text-amber-500 animate-pulse" />
          <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400">GNU bash 5.2.21 (Interactive Session)</span>
        </div>

        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 border border-emerald-900/50 rounded flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 animate-pulse" /> BASH ENGINE: ACTIVE
        </span>
      </div>

      {/* Terminal Content Screen */}
      <div 
        onClick={handleTerminalClick}
        className="flex-1 w-full h-full relative"
      >
        <div 
          ref={containerRef}
          className="w-full h-full p-4 overflow-y-auto space-y-3.5 select-text scrollbar-thin scrollbar-thumb-stone-800 scrollbar-track-transparent text-left"
        >
          {/* Boot details shown first */}
          <div className="space-y-1 text-zinc-500 leading-normal text-[11px]">
            {bootLines.map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </div>

          {!booting && (
            <div className="space-y-3.5 mt-2">
              {history.map((item, idx) => (
                <div key={idx} className="space-y-1.5 font-mono">
                  <div className="flex items-center gap-1.5 font-bold text-xs select-none">
                    <span className="text-cyan-400">{username}@landala-pc:{getPromptPath(currentDir)}$</span>
                    <span className="text-white">{item.command}</span>
                  </div>
                  {item.output && (
                    <div className="pl-3.5 leading-relaxed text-stone-300 text-xs select-text">{item.output}</div>
                  )}
                </div>
              ))}

              {/* Current Input prompt */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-cyan-400 font-semibold text-xs shrink-0 select-none">{username}@landala-pc:{getPromptPath(currentDir)}$</span>
                <div className="flex-1 flex items-center relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    placeholder='Try "help" or "cmatrix" to start...'
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-transparent text-white outline-none border-none font-mono text-xs p-0 m-0 focus:ring-0 focus:outline-none placeholder-zinc-750"
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
