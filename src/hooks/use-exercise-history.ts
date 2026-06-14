import { useQuery } from '@tanstack/react-query';

import { getExerciseHistoryViewSupabase } from '@/services/supabase-sync';
import { useJimStore } from '@/store/jimStore';

export function useExerciseHistory(exerciseId?: string) {
  const user = useJimStore((state) => state.user);

  return useQuery({
    queryKey: ['exercise-history-view', user?.id, exerciseId],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) return [];
      return getExerciseHistoryViewSupabase(user.id, exerciseId);
    },
  });
}
