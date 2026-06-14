import { useQuery } from '@tanstack/react-query';

import { getExerciseHistoryViewSupabase } from '@/services/supabase-sync';
import { useGymStore } from '@/store/gymStore';

export function useExerciseHistory(exerciseId?: string) {
  const user = useGymStore((state) => state.user);

  return useQuery({
    queryKey: ['exercise-history-view', user?.id, exerciseId],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) return [];
      return getExerciseHistoryViewSupabase(user.id, exerciseId);
    },
  });
}
