// Displays the team member grid on the homepage.
// Imports team data from data/team.js

import { teamMembers } from '../data/team';         // import the teamMembers array from the data folder

export default function TeamSection() {
  return (
    <div className="section-wrapper">               {/* wrapper for the team section */}
      <h2 className="section-title text-center">Meet The Team</h2>                        {/* section heading */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">   {/* grid container */}
        {teamMembers.map((member, index) => (       // .map() loops over each team member object
          <div key={index} className="card-team">   {/* card wrapper for one member; key required by React for lists */}
            <div className="w-24 h-24 rounded-full bg-border flex items-center justify-center text-text-muted text-xs overflow-hidden">
               <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-display text-base text-text-primary">{member.name}</p>                    {/* member's name */}
              <p className="font-body text-xs text-ultraviolet">{member.title}</p>                   {/* member's role/title */}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}