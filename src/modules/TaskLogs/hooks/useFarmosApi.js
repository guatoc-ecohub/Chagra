// src/modules/TaskLogs/hooks/useFarmosApi.js
import { useState, useCallback, useRef } from 'react';

export const useFarmosApi = () => {
  const [isRequesting, setIsRequesting] = useState(false);
  const requestCache = useRef(new Map());

  // Enrutamiento relativo para utilizar API Gateway de Nginx
  const API_BASE_URL = '/api';
  const BEARER_TOKEN = localStorage.getItem('farmos_token');

  const getHeaders = () => ({
    'Authorization': `Bearer ${BEARER_TOKEN}`,
    'Content-Type': 'application/vnd.api+json',
    'Accept': 'application/vnd.api+json'
  });

  const fetchTasks = useCallback(async () => {
    const cacheKey = 'tasks_list';
    if (requestCache.current.has(cacheKey)) {
      return requestCache.current.get(cacheKey);
    }

    setIsRequesting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/log/task?sort=-timestamp`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const jsonApiData = await response.json();

      // Patrón Adapter: Mapeo de JSON:API a modelo plano para React
      const tasks = (jsonApiData.data || []).map(item => ({
        id: item.id,
        name: item.attributes.name,
        status: item.attributes.status,
        description: item.attributes.notes || '',
        date: item.attributes.timestamp,
        priority: item.attributes.priority || 'normal',
      }));

      requestCache.current.set(cacheKey, tasks);
      setTimeout(() => requestCache.current.delete(cacheKey), 300000); // 5 min TTL

      return tasks;
    } catch (error) {
      console.error('FarmOS API Error:', error);
      throw error;
    } finally {
      setIsRequesting(false);
    }
  }, [BEARER_TOKEN]);

  const updateTask = useCallback(async (taskId, status) => {
    setIsRequesting(true);
    try {
      const payload = {
        data: {
          type: "log--task",
          id: taskId,
          attributes: { status: status }
        }
      };

      const response = await fetch(`${API_BASE_URL}/log/task/${taskId}`, {
        method: 'PATCH', // JSON:API exige PATCH para actualizaciones
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`Update failed: ${response.statusText}`);

      // Invalidar caché local tras actualización exitosa
      requestCache.current.delete('tasks_list');
      return await response.json();
    } catch (error) {
      console.error('FarmOS API Error:', error);
      throw error;
    } finally {
      setIsRequesting(false);
    }
  }, [BEARER_TOKEN]);

  return { fetchTasks, updateTask, isRequesting };
};
