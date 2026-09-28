import { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  startAfter, 
  onSnapshot,
  DocumentData,
  QueryDocumentSnapshot,
  getFirestore
} from 'firebase/firestore';
import { db, sandboxMode, dataStore } from '../config/firebase';

interface UseFirestoreQueryOptions {
  pageSize?: number;
  debounceMs?: number;
}

export function useFirestoreQuery<T = any>(options: UseFirestoreQueryOptions = {}) {
  const pageSize = options.pageSize || 10;
  const debounceMs = options.debounceMs || 300;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [pageCount, setPageCount] = useState(1);
  const cursorsRef = useRef<any[]>([]);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bufferedDataRef = useRef<T[]>([]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, []);

  const loadMore = () => {
    if (!loading && hasMore) {
      setPageCount(prev => prev + 1);
    }
  };

  const resetPagination = () => {
    setPageCount(1);
    cursorsRef.current = [];
    setData([]);
    setHasMore(true);
  };

  useEffect(() => {
    setLoading(true);

    // Helper to apply debounced state update
    const applyDataUpdate = (newData: T[]) => {
      bufferedDataRef.current = newData;
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        setData(bufferedDataRef.current);
        setLoading(false);
      }, debounceMs);
    };

    if (!sandboxMode && db) {
      // Real Firebase implementation with query limits, ordering, and cursor startAfter
      try {
        const collectionRef = collection(db, 'inventory_levels');
        let q = query(
          collectionRef, 
          orderBy('stockLevel', 'asc'), 
          limit(pageSize * pageCount)
        );

        // Subscribe using onSnapshot for real-time changes
        const unsub = onSnapshot(q, (snapshot) => {
          const items: T[] = [];
          snapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() } as T);
          });

          // If we received fewer items than requested, we've reached the end
          setHasMore(items.length === pageSize * pageCount);
          applyDataUpdate(items);
        }, (err) => {
          console.error("Firestore onSnapshot error:", err);
          setError(err);
          setLoading(false);
        });

        // Store active unsubscribe callback to clean up on change/unmount
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
        }
        unsubscribeRef.current = unsub;

      } catch (err: any) {
        setError(err);
        setLoading(false);
      }
    } else {
      // Sandbox fallback
      const unsubLocal = dataStore.subscribeToCollection('inventory', () => {
        const allLocalInventory = dataStore.getInventory();
        // Sort ascending stockLevel to match query
        const sorted = [...allLocalInventory].sort((a, b) => (a.stockLevel || 0) - (b.stockLevel || 0));
        
        // Paginate locally
        const pageItems = sorted.slice(0, pageSize * pageCount);
        setHasMore(sorted.length > pageSize * pageCount);
        applyDataUpdate(pageItems as any[]);
      });

      // Trigger initial loading
      const allLocalInventory = dataStore.getInventory();
      const sorted = [...allLocalInventory].sort((a, b) => (a.stockLevel || 0) - (b.stockLevel || 0));
      const pageItems = sorted.slice(0, pageSize * pageCount);
      setHasMore(sorted.length > pageSize * pageCount);
      applyDataUpdate(pageItems as any[]);

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      unsubscribeRef.current = unsubLocal;
    }
  }, [pageCount, pageSize, debounceMs]);

  return {
    data,
    loading,
    hasMore,
    error,
    loadMore,
    resetPagination
  };
}
