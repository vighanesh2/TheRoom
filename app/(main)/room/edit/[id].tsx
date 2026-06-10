import { useLocalSearchParams } from 'expo-router';

import { RoomFormScreen } from '@/components/room/RoomFormScreen';

export default function EditRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <RoomFormScreen roomId={id} />;
}
