import React from 'react'
import { useState } from 'react';
import { useEffect } from 'react';

import { Box, CardHeader,Badge,IconButton, Chip, Typography } from '@mui/material'
import { Card,CardActions, Divider} from '@mui/material'
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AccessTimeFilledIcon from '@mui/icons-material/AccessTimeFilled';

import { Grid } from '@mui/material'
import '../style/listitem.css'
import Moment from "moment"
import handleApi from '../service/handleApi'
import { Link } from 'react-router-dom';
const ListTopics = () => {
    const [listtopics, setlisttopics] = useState([]);
    useEffect(() =>{
      retrievelisttopics()
    },[])
    const retrievelisttopics = () => {
      handleApi.getListTopic()
        .then(response => {
          setlisttopics(response.data);
          console.log(response.data);
        })
        .catch(e => {
          console.log(e);
        });
    };
  return (
    <Box>
        <Grid container  className='header' >
                <Grid item xs={12}  className='header-item'>
                            <Typography variant='h3' fontWeight="fontWeightBold" color="white" >
                                All topics
                            </Typography>
                </Grid>
            </Grid>
        <Grid container className='list-item'>
            {
                listtopics.topics?.map((topic) =>(
                <Grid item xs={12} md={4} className="topic-item">
                    <Link to = {"/topics/"+topic.id } style={{ textDecoration: 'none'}}>
                    <Card className='topic'>
                    <CardHeader title={topic.name} action={
                        <IconButton>
                            <Badge badgeContent={topic.idea_quantity} color="primary">
                                <EmojiObjectsIcon color="action"/>
                            </Badge>
                        </IconButton>
                    }>
                    </CardHeader>
                    <Divider />
                    <CardActions>
                        <Grid xs={12} className="date">
                        <Chip icon={<AccessTimeIcon/>} label={Moment(topic.closure_date).format('YYYY/MM/DD')} size="small" color="warning" />
                        <Chip icon={<AccessTimeFilledIcon/>} label={Moment(topic.final_closure_date).format('YYYY/MM/DD')} size="small" color="primary" />
                        </Grid>
                    </CardActions>
                </Card>
                    </Link>
                
            </Grid> 
                ))
            }
        </Grid>
      
    </Box>
  )
}

export default ListTopics