import 'react-native-url-polyfill/auto';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  ImageBackground,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { supabase } from './utils/supabase';
import { Database } from './database.types';
import Config from 'react-native-config';
import { ListFilesResponse } from './types/API';
import Video from 'react-native-video';
import { useKeepAwake } from '@sayem314/react-native-keep-awake';
import DeviceInfo from 'react-native-device-info';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [currentFolder, setCurrentFolder] = useState<string>();
  const [images, setImages] = useState<
    {
      url: string;
      contentType: string;
    }[]
  >([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [lowEndDevices] = useMemo<string[]>(() => ['SM-J600FN'], []);
  const deviceName = DeviceInfo.getModel();

  const startSlideshowInterval = () => {
    intervalRef.current = setInterval(() => {
      if (
        images[currentImageIndex + 1] &&
        images[currentImageIndex + 1].contentType.startsWith('video/') &&
        intervalRef.current
      ) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setCurrentImageIndex(prev => (prev + 1 >= images.length ? 0 : prev + 1));
    }, 5_000);
  };

  // Keep awake
  useKeepAwake();

  useEffect(() => {
    // Fetch initial data
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('slideshow_control')
          .select();

        if (error || !data || data.length === 0) {
          console.error('Error fetching slideshow control:', error);
          return;
        }

        // Set the current folder based on the fetched data
        const folder = `Pictures/${data[0].source}/${data[0].active_year}/${data[0].active_month}`;
        setCurrentFolder(folder);

        setLoading(true);

        // Fetch files from the API
        const response = await fetch(
          `${Config.API_URL}/api/list-files?folder=${folder}`,
          {
            headers: {
              Authorization: `Bearer ${Config.BEARER_TOKEN}`,
            },
          },
        );

        const json = (await response.json()) as ListFilesResponse;

        const processed = json.files.map(file => {
          const isImage = file.key.match(/\.(jpg|jpeg|png)$/);
          return {
            url: file.publicUrl,
            contentType: isImage
              ? 'image/' + file.key.split('.').pop()
              : 'video/mp4',
          };
        });

        setImages(processed);
        setLoading(false);
      } catch (err) {
        console.error('Fetch error:', err);
      }
    };

    fetchData();

    // Subscribe to DB changes
    const subscription = supabase
      .channel('public:slideshow')
      .on('postgres_changes', { event: '*', schema: 'public' }, payload => {
        // Payload changed
        setLoading(true);

        if (payload.table === 'slideshow_control') {
          const newPayload =
            payload.new as Database['public']['Tables']['slideshow_control']['Row'];

          const newFolder = `Pictures/${newPayload.source}/${newPayload.active_year}/${newPayload.active_month}`;

          setCurrentFolder(prev => {
            if (prev !== newFolder) return newFolder;

            return prev;
          });

          setCurrentImageIndex(0);
        }

        setLoading(false);
      })
      .subscribe();

    // Start slideshow loop
    if (
      images.length > 0 &&
      currentImageIndex < images.length &&
      images[currentImageIndex].contentType?.startsWith('image/')
    ) {
      // Image content
      startSlideshowInterval();
    } else if (images.length > 0 && currentImageIndex < images.length) {
      // Video content
      setLoading(false);
    }

    return () => {
      supabase.removeChannel(subscription);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolder, images.length]);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        hidden
      />

      {loading || !images[currentImageIndex] ? (
        <Text style={styles.text}>Loading...</Text>
      ) : images[currentImageIndex].contentType.startsWith('image/') ? (
        <ImageBackground
          source={{
            uri: images[currentImageIndex].url,
          }}
          style={styles.backgroundImage}
          blurRadius={100}
        >
          <Image
            src={images[currentImageIndex].url}
            style={{
              ...styles.fullScreen,
              ...styles.fullScreenImage,
            }}
            key={currentImageIndex}
          />
        </ImageBackground>
      ) : (
        <Video
          source={{
            uri: lowEndDevices.includes(deviceName)
              ? `${images[currentImageIndex].url.replace(
                  /\.\w+$/gm,
                  '.low.mp4',
                )}`
              : images[currentImageIndex].url,
            bufferConfig: {
              // These values are for a 4K high bitrate video, the low quality videos are much smaller and will run without issues
              minBufferMs: 3000, // 3 sec = ~10 MB
              maxBufferMs: 8000, // 8 sec = ~29 MB
              bufferForPlaybackMs: 1500,
              bufferForPlaybackAfterRebufferMs: 3000,
            },
          }}
          style={styles.fullScreen}
          resizeMode="contain"
          paused={false}
          controls={false}
          onEnd={() => {
            // Skipping to next video
            startSlideshowInterval();
            setCurrentImageIndex(
              currentImageIndex + 1 >= images.length
                ? 0
                : currentImageIndex + 1,
            );
          }}
          onLoadStart={() => {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }}
          repeat
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    display: 'flex',
    height: '100%',
  },
  fullScreen: {
    height: '100%',
  },
  fullScreenImage: {
    resizeMode: 'contain',
  },
  text: {
    color: '#ffffff',
    fontSize: 20,
    textAlign: 'center',
    marginVertical: 'auto',
  },
});

export default App;
