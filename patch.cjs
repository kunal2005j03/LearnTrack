const fs = require('fs');
let code = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');
const search = "const [checkingApi, setCheckingApi] = useState(false);";
const replace = `const [checkingApi, setCheckingApi] = useState(false);

  const [tasksConnected, setTasksConnected] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(true);

  useEffect(() => {
    getAccessToken().then(token => {
      setTasksConnected(!!token);
      setTasksLoading(false);
    });
  }, []);

  const handleConnectTasks = async () => {
    setTasksLoading(true);
    try {
      await connectGoogleTasks();
      setTasksConnected(true);
    } catch (e) {
      console.error("Failed to connect tasks:", e);
    } finally {
      setTasksLoading(false);
    }
  };

  const handleDisconnectTasks = async () => {
    await disconnectGoogleTasks();
    setTasksConnected(false);
  };`;
code = code.replace(search, replace);
fs.writeFileSync('src/pages/SettingsPage.tsx', code);
