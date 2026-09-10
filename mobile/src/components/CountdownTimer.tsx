import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { supabase } from '../supabase';

interface CountdownTimerProps {
  onExpire?: () => void;
  onTimerLoaded?: (endTime: string | null) => void;
  compact?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  onExpire,
  onTimerLoaded,
  compact = false,
}) => {
  const [endTime, setEndTime] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalMs: number;
  } | null>(null);

  useEffect(() => {
    const fetchEndTime = async () => {
      try {
        const { data, error } = await supabase
          .from('election_settings')
          .select('end_time')
          .limit(1)
          .maybeSingle();

        if (error) {
          console.warn('Error fetching election countdown:', error);
          return;
        }

        if (data && data.end_time) {
          setEndTime(data.end_time);
          if (onTimerLoaded) onTimerLoaded(data.end_time);
        } else if (!data) {
          const defaultEndTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          await supabase.from('election_settings').upsert({ id: 1, end_time: defaultEndTime });
          setEndTime(defaultEndTime);
          if (onTimerLoaded) onTimerLoaded(defaultEndTime);
        }
      } catch (err) {
        console.warn('CountdownTimer fetch error:', err);
      }
    };

    fetchEndTime();
    const interval = setInterval(fetchEndTime, 5000);
    return () => clearInterval(interval);
  }, [onTimerLoaded]);

  useEffect(() => {
    if (!endTime) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const difference = +new Date(endTime) - +new Date();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 });
        if (onExpire) onExpire();
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        totalMs: difference,
      });
    };

    calculateTimeLeft();
    const timerId = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timerId);
  }, [endTime, onExpire]);

  if (!endTime || !timeLeft) {
    return (
      <View style={styles.loadingBox}>
        <Text style={styles.loadingText}>⏳ Loading Election Countdown...</Text>
      </View>
    );
  }

  const isExpired = timeLeft.totalMs <= 0;

  if (compact) {
    if (isExpired) {
      return <Text style={styles.expiredCompactText}>Voting Closed</Text>;
    }
    return (
      <Text style={styles.compactText}>
        {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
        {String(timeLeft.hours).padStart(2, '0')}:
        {String(timeLeft.minutes).padStart(2, '0')}:
        {String(timeLeft.seconds).padStart(2, '0')}
      </Text>
    );
  }

  return (
    <View style={[styles.timerCard, isExpired && styles.expiredCard]}>
      <View style={styles.headerRow}>
        <View style={[styles.pulseDot, isExpired && styles.expiredPulseDot]} />
        <Text style={[styles.statusTagText, isExpired && styles.expiredStatusTagText]}>
          {isExpired ? 'ELECTION CONCLUDED' : 'OFFICIAL ELECTION COUNTDOWN'}
        </Text>
      </View>

      <Text style={styles.headerTitle}>
        {isExpired ? 'Voting Period Has Ended' : 'Time Remaining to Cast Ballot'}
      </Text>

      <View style={styles.dialGrid}>
        <View style={styles.dialBox}>
          <Text style={styles.dialNumber}>{String(timeLeft.days).padStart(2, '0')}</Text>
          <Text style={styles.dialLabel}>DAYS</Text>
        </View>
        <View style={styles.dialBox}>
          <Text style={styles.dialNumber}>{String(timeLeft.hours).padStart(2, '0')}</Text>
          <Text style={styles.dialLabel}>HOURS</Text>
        </View>
        <View style={styles.dialBox}>
          <Text style={styles.dialNumber}>{String(timeLeft.minutes).padStart(2, '0')}</Text>
          <Text style={styles.dialLabel}>MINUTES</Text>
        </View>
        <View style={styles.dialBox}>
          <Text style={styles.dialNumber}>{String(timeLeft.seconds).padStart(2, '0')}</Text>
          <Text style={styles.dialLabel}>SECONDS</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingBox: {
    padding: 10,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  compactText: {
    color: '#10B981',
    fontWeight: '800',
    fontSize: 13,
  },
  expiredCompactText: {
    color: '#F87171',
    fontWeight: '800',
    fontSize: 13,
  },
  timerCard: {
    backgroundColor: 'rgba(17, 34, 64, 0.85)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 12,
    alignItems: 'center',
  },
  expiredCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: '#EF4444',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  expiredPulseDot: {
    backgroundColor: '#EF4444',
  },
  statusTagText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  expiredStatusTagText: {
    color: '#F87171',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 14,
    textAlign: 'center',
  },
  dialGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  dialBox: {
    backgroundColor: '#0A192F',
    borderWidth: 1,
    borderColor: '#233554',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 64,
  },
  dialNumber: {
    color: '#10B981',
    fontSize: 20,
    fontWeight: '800',
  },
  dialLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
