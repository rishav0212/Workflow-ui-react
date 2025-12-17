import { useEffect, useState } from "react";
import { fetchTasks, type Task } from "./api";
import { useNavigate } from "react-router-dom";

// 1. Add Props Interface
interface TaskListProps {
  currentUser: string;
}

// 2. Accept Props
export default function TaskList({ currentUser }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const navigate = useNavigate();


  useEffect(() => {
    // 3. Use the Real User ID
    if (currentUser) {
      console.log("Fetching tasks for:", currentUser);
      fetchTasks(currentUser).then(setTasks).catch(console.error);
    }
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Inbox for {currentUser}
        </h1>
        {/* ... Rest of your table code stays exactly the same ... */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {task.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(task.createTime).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => navigate(`/task/${task.id}`)}
                      className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded-full transition"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-10 text-center text-gray-500"
                  >
                    No active tasks found. Great job!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
