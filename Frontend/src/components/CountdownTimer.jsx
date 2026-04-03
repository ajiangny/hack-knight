export default function CountdownTimer() {
    return (
      <div className="flex justify-center my-12">                                           {/* outer wrapper for the countdown block */}
        <div className="flex gap-4 items-start">                                         {/* inner wrapper for the five time units */}
          <div className="flex flex-col items-center"><span className="timer-digit">03</span> <small className="timer-label">MONTHS</small></div> <span className="timer-digit mt-1">:</span>
          <div className="flex flex-col items-center"><span className="timer-digit">13</span> <small className="timer-label">DAYS</small></div> <span className="timer-digit mt-1">:</span>
          <div className="flex flex-col items-center"><span className="timer-digit">23</span> <small className="timer-label">HOURS</small></div> <span className="timer-digit mt-1">:</span>
          <div className="flex flex-col items-center"><span className="timer-digit">37</span> <small className="timer-label">MINUTES</small></div> <span className="timer-digit mt-1">:</span>
          <div className="flex flex-col items-center"><span className="timer-digit">59</span> <small className="timer-label">SECONDS</small></div>
        </div>
      </div>
    );
  }