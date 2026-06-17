import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle, 
  withSpring,
  useSharedValue
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { TouchableOpacity } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');

interface ImmediateFeedbackProps {
  isVisible: boolean;
  isCorrect: boolean;
  message?: string;
  onClose?: () => void;
}

export const ImmediateFeedback: React.FC<ImmediateFeedbackProps> = ({ 
  isVisible, 
  isCorrect, 
  message,
  onClose
}) => {
  const insets = useSafeAreaInsets();
  const { colors, s } = useTheme();
  const dynamics = getStyles(s);

  if (!isVisible) return null;

  const backgroundColor = isCorrect ? '#d7ffb8' : '#ffdfe0';
  const textColor = isCorrect ? '#58a700' : '#ea2b2b';
  const iconName = isCorrect ? "check-circle" : "cancel";

  return (
    <Animated.View 
      entering={SlideInDown.springify().damping(18).stiffness(100).mass(0.8)} 
      exiting={SlideOutDown.springify().damping(20)}
      style={[
        dynamics.container, 
        { 
          backgroundColor,
          paddingBottom: Math.max(insets.bottom, s(20)) + s(10),
          borderColor: isCorrect ? '#84d800' : '#ff4b4b',
          borderTopWidth: 2
        }
      ]}
    >
      {onClose && (
        <TouchableOpacity 
          onPress={onClose} 
          style={dynamics.closeBtn}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <MaterialIcons name="close" size={s(20)} color={textColor} style={{ opacity: 0.6 }} />
        </TouchableOpacity>
      )}

      <View style={dynamics.content}>
        <View style={dynamics.header}>
          <MaterialIcons 
            name={iconName} 
            size={s(32)} 
            color={textColor} 
          />
          <Text style={[dynamics.title, { color: textColor }]}>
            {isCorrect ? "Excellent !" : "Presque !"}
          </Text>
        </View>
        
        <Text style={[dynamics.message, { color: textColor }]}>
          {message || (isCorrect 
            ? "Vous avez trouvé la bonne réponse." 
            : "La réponse correcte était à portée de main.")}
        </Text>
      </View>
    </Animated.View>
  );
};

const getStyles = (s: (v: number) => number) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingHorizontal: s(24),
    paddingTop: s(24),
    zIndex: 2000,
    elevation: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    borderTopLeftRadius: s(30),
    borderTopRightRadius: s(30),
  },
  content: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(16),
    marginBottom: s(12),
  },
  title: {
    fontSize: s(28),
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  message: {
    fontSize: s(18),
    fontWeight: '700',
    lineHeight: s(24),
    opacity: 0.95,
    paddingRight: s(40),
  },
  closeBtn: {
    position: 'absolute',
    right: s(12),
    top: s(12),
    padding: s(8),
    zIndex: 10,
  }
});
